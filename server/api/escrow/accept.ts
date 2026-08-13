import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { initializeTransaction } from '../../src/paystack.js';

// Flat platform commission on escrow-path (small task) jobs — kept here rather than
// in the DB for now since it's a single uniform rate; move to a per-category column
// if pricing ever needs to vary, same reasoning as LEAD_FEE_NAIRA in leads/initialize.
const ESCROW_COMMISSION_RATE = 0.1;

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

  const { bidId } = req.body ?? {};
  if (!bidId || typeof bidId !== 'string') {
    return res.status(400).json({ error: 'bidId is required' });
  }

  const { data: bid, error: bidError } = await supabaseAdmin
    .from('bids')
    .select('id, task_id, tasker_id, amount, status')
    .eq('id', bidId)
    .maybeSingle();

  if (bidError || !bid) {
    return res.status(404).json({ error: 'Bid not found' });
  }

  const { data: task, error: taskError } = await supabaseAdmin
    .from('tasks')
    .select('id, poster_id, status, path')
    .eq('id', bid.task_id)
    .maybeSingle();

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.poster_id !== user.id) {
    return res.status(403).json({ error: 'Only the task poster can accept this bid' });
  }
  if (task.path !== 'escrow') {
    return res.status(400).json({ error: 'This task does not use the escrow flow' });
  }
  if (task.status !== 'open') {
    return res.status(400).json({ error: 'This task is no longer open' });
  }
  if (bid.status !== 'pending') {
    return res.status(400).json({ error: 'This bid is no longer pending' });
  }

  // The tasker must have a verified payout account before their bid can be accepted,
  // otherwise the tasker gets paid into a void once the task completes.
  const { data: taskerProfile } = await supabaseAdmin
    .from('profiles')
    .select('paystack_recipient_code')
    .eq('id', bid.tasker_id)
    .maybeSingle();

  if (!taskerProfile?.paystack_recipient_code) {
    return res.status(400).json({
      error:
        'This tasker has not set up a payout bank account yet. They need to add one before you can accept their bid.',
    });
  }

  // Reuse an existing charge_pending row for this bid if the poster retried (e.g.
  // abandoned checkout and clicked Accept again), instead of creating duplicates.
  const { data: existingTxn } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, status')
    .eq('bid_id', bidId)
    .maybeSingle();

  if (existingTxn && !['pending', 'charge_pending'].includes(existingTxn.status)) {
    return res.status(409).json({ error: 'This bid has already been paid for' });
  }

  const commissionAmount = Math.round(bid.amount * ESCROW_COMMISSION_RATE * 100) / 100;
  const payoutAmount = Math.round((bid.amount - commissionAmount) * 100) / 100;

  const txnId = existingTxn?.id ?? randomUUID();
  const reference = `escrow_${txnId}_${Date.now()}`;

  if (!existingTxn) {
    const { error: insertError } = await supabaseAdmin.from('escrow_transactions').insert({
      id: txnId,
      task_id: task.id,
      bid_id: bidId,
      poster_id: user.id,
      tasker_id: bid.tasker_id,
      paystack_reference: reference,
      amount: bid.amount,
      commission_amount: commissionAmount,
      payout_amount: payoutAmount,
      status: 'charge_pending',
    });
    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }
  } else {
    const { error: updateError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ paystack_reference: reference, status: 'charge_pending' })
      .eq('id', txnId);
    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }
  }

  if (!user.email) {
    return res
      .status(400)
      .json({ error: 'Your account needs an email address to accept a bid.' });
  }

  try {
    const transaction = await initializeTransaction({
      email: user.email,
      amountKobo: Math.round(bid.amount * 100),
      reference,
      callbackUrl: `${process.env.APP_URL}/my-tasks?escrow_payment=complete`,
      metadata: { escrowTransactionId: txnId, bidId, taskId: task.id, posterId: user.id },
    });

    return res.status(200).json({ authorizationUrl: transaction.authorization_url });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to start payment with Paystack',
    });
  }
}
