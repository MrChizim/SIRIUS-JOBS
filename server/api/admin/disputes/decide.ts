import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../src/cors.js';
import { supabaseAdmin } from '../../../src/supabaseAdmin.js';
import { requireAdmin } from '../../../src/adminAuth.js';
import { initiateTransfer, refundTransaction } from '../../../src/paystack.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAdmin(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { disputeId, decision, notes } = req.body ?? {};
  if (!disputeId || typeof disputeId !== 'string') {
    return res.status(400).json({ error: 'disputeId is required' });
  }
  if (decision !== 'release_to_tasker' && decision !== 'refund_to_poster') {
    return res
      .status(400)
      .json({ error: 'decision must be "release_to_tasker" or "refund_to_poster"' });
  }
  if (!notes || typeof notes !== 'string' || notes.trim().length < 5) {
    return res.status(400).json({ error: 'Resolution notes are required' });
  }

  const { data: dispute, error: disputeError } = await supabaseAdmin
    .from('disputes')
    .select('id, task_id, status')
    .eq('id', disputeId)
    .maybeSingle();

  if (disputeError || !dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }
  if (dispute.status !== 'open') {
    return res.status(400).json({ error: 'This dispute has already been resolved' });
  }

  const { data: escrowTxn, error: escrowError } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, status, amount, payout_amount, paystack_reference, tasker_id')
    .eq('task_id', dispute.task_id)
    .eq('status', 'disputed')
    .maybeSingle();

  if (escrowError || !escrowTxn) {
    return res.status(400).json({ error: 'No disputed escrow payment found for this task' });
  }

  if (decision === 'release_to_tasker') {
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
        reason: `Sirius Jobs dispute resolution payout for task ${dispute.task_id}`,
      });

      const { error: rpcError } = await supabaseAdmin.rpc('resolve_dispute_release', {
        p_dispute_id: disputeId,
        p_resolution_notes: notes,
        p_transfer_code: transfer.transfer_code,
      });

      if (rpcError) {
        console.error('resolve_dispute_release failed after transfer was initiated', rpcError);
        return res.status(500).json({
          error:
            'Payout started but failed to update dispute status. Contact support immediately — do not retry.',
        });
      }

      return res.status(200).json({ status: 'released', transferCode: transfer.transfer_code });
    } catch (err) {
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to initiate payout',
      });
    }
  }

  // refund_to_poster
  try {
    const refund = await refundTransaction({ reference: escrowTxn.paystack_reference });

    const { error: rpcError } = await supabaseAdmin.rpc('resolve_dispute_refund', {
      p_dispute_id: disputeId,
      p_resolution_notes: notes,
    });

    if (rpcError) {
      console.error('resolve_dispute_refund failed after refund was issued', rpcError);
      return res.status(500).json({
        error:
          'Refund issued but failed to update dispute status. Contact support immediately — do not retry.',
      });
    }

    return res.status(200).json({ status: 'refunded', refundId: refund.id });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to process refund',
    });
  }
}
