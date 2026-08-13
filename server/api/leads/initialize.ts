import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../src/cors.js';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { initializeTransaction } from '../../src/paystack.js';

// Flat lead fee per accepted category — kept here rather than in the DB for now since
// there's only one tier; move to a per-category column if pricing ever needs to vary.
const LEAD_FEE_NAIRA = 2000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const accessToken = authHeader.slice('Bearer '.length);

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { taskId } = req.body ?? {};
  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'taskId is required' });
  }

  const { data: task, error: taskError } = await supabaseAdmin
    .from('tasks')
    .select('id, path, status, title')
    .eq('id', taskId)
    .maybeSingle();

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (task.path !== 'lead_fee') {
    return res.status(400).json({ error: 'This task does not use the lead-fee flow' });
  }
  if (task.status !== 'open') {
    return res.status(400).json({ error: 'This task is no longer open' });
  }

  const { data: existingLead } = await supabaseAdmin
    .from('leads')
    .select('id, status')
    .eq('task_id', taskId)
    .eq('professional_id', user.id)
    .maybeSingle();

  if (existingLead && existingLead.status !== 'pending_payment') {
    return res.status(409).json({ error: 'You have already purchased this lead' });
  }

  const leadId = existingLead?.id ?? randomUUID();

  if (!existingLead) {
    const { error: insertError } = await supabaseAdmin.from('leads').insert({
      id: leadId,
      task_id: taskId,
      professional_id: user.id,
      lead_fee_charged: LEAD_FEE_NAIRA,
      status: 'pending_payment',
    });
    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }
  }

  const reference = `lead_${leadId}_${Date.now()}`;

  const { error: paymentInsertError } = await supabaseAdmin.from('lead_payments').insert({
    lead_id: leadId,
    paystack_reference: reference,
    amount: LEAD_FEE_NAIRA,
    status: 'pending',
  });
  if (paymentInsertError) {
    return res.status(500).json({ error: paymentInsertError.message });
  }

  if (!user.email) {
    return res.status(400).json({ error: 'Your account needs an email address to pay for a lead.' });
  }

  try {
    const transaction = await initializeTransaction({
      email: user.email,
      amountKobo: LEAD_FEE_NAIRA * 100,
      reference,
      callbackUrl: `${process.env.APP_URL}/tasks/${taskId}?lead_payment=complete`,
      metadata: { leadId, taskId, professionalId: user.id },
    });

    return res.status(200).json({ authorizationUrl: transaction.authorization_url });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to start payment with Paystack',
    });
  }
}
