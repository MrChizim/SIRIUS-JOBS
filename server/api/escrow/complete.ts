import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { initiateTransfer } from '../../src/paystack.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(authHeader.slice('Bearer '.length));

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { taskId } = req.body ?? {};
  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'taskId is required' });
  }

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, status')
    .eq('id', taskId)
    .maybeSingle();

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.poster_id !== user.id) {
    return res.status(403).json({ error: 'Only the task poster can mark this complete' });
  }
  if (task.status !== 'in_progress') {
    return res.status(400).json({ error: 'Task must be in progress to mark it complete' });
  }

  const { data: escrowTxn } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, status, payout_amount, tasker_id')
    .eq('task_id', taskId)
    .eq('status', 'held')
    .maybeSingle();

  if (!escrowTxn) {
    return res.status(400).json({ error: 'No held escrow payment found for this task' });
  }

  const { data: taskerProfile } = await supabaseAdmin
    .from('profiles')
    .select('paystack_recipient_code')
    .eq('id', escrowTxn.tasker_id)
    .maybeSingle();

  if (!taskerProfile?.paystack_recipient_code) {
    return res.status(400).json({ error: 'Tasker has no payout account on file' });
  }

  const transferReference = `payout_${escrowTxn.id}_${Date.now()}`;

  try {
    const transfer = await initiateTransfer({
      amountKobo: Math.round(escrowTxn.payout_amount * 100),
      recipientCode: taskerProfile.paystack_recipient_code,
      reference: transferReference,
      reason: `Sirius Jobs payout for task ${taskId}`,
    });

    await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'payout_pending',
        paystack_transfer_code: transfer.transfer_code,
      })
      .eq('id', escrowTxn.id)
      .eq('status', 'held');

    // The task moves to 'completed' now (the work itself is confirmed done by the
    // poster); the money's payout_pending -> released transition happens
    // independently via the transfer.success webhook and doesn't block this.
    const { error: rpcError } = await supabaseAdmin.rpc('finalize_task_completion', {
      p_task_id: taskId,
      p_poster_id: user.id,
    });

    if (rpcError) {
      console.error('finalize_task_completion failed after transfer was initiated', rpcError);
      return res.status(500).json({
        error: 'Payout started but failed to update task status. Contact support.',
      });
    }

    return res.status(200).json({ status: 'completed', transferCode: transfer.transfer_code });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to initiate payout',
    });
  }
}
