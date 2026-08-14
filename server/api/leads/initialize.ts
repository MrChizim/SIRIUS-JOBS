import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../src/cors.js';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { initializeTransaction } from '../../src/paystack.js';

// Lead fee scales with the task's budget instead of being flat, so a ₦6k roof
// patch doesn't cost the same to unlock as a ₦500k renovation. 5% of the top of
// the poster's budget range, floored and capped so it stays affordable on small
// jobs and meaningful on large ones. Falls back to the floor when no budget was
// given (budget fields are optional on post-a-task).
const LEAD_FEE_RATE = 0.05;
const LEAD_FEE_FLOOR_NAIRA = 500;
const LEAD_FEE_CAP_NAIRA = 10000;

function calculateLeadFee(budgetMax: number | null, budgetMin: number | null): number {
  const budget = budgetMax ?? budgetMin;
  if (!budget || budget <= 0) return LEAD_FEE_FLOOR_NAIRA;

  const raw = budget * LEAD_FEE_RATE;
  const clamped = Math.min(Math.max(raw, LEAD_FEE_FLOOR_NAIRA), LEAD_FEE_CAP_NAIRA);
  return Math.round(clamped / 100) * 100; // round to the nearest ₦100
}

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
    .select('id, path, status, title, budget_min, budget_max')
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
    .select('id, status, lead_fee_charged')
    .eq('task_id', taskId)
    .eq('professional_id', user.id)
    .maybeSingle();

  if (existingLead && existingLead.status !== 'pending_payment') {
    return res.status(409).json({ error: 'You have already purchased this lead' });
  }

  const leadFeeNaira = existingLead?.lead_fee_charged ?? calculateLeadFee(task.budget_max, task.budget_min);
  const leadId = existingLead?.id ?? randomUUID();

  if (!existingLead) {
    const { error: insertError } = await supabaseAdmin.from('leads').insert({
      id: leadId,
      task_id: taskId,
      professional_id: user.id,
      lead_fee_charged: leadFeeNaira,
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
    amount: leadFeeNaira,
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
      amountKobo: leadFeeNaira * 100,
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
