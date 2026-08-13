import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../src/cors.js';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { initializeTransaction } from '../../src/paystack.js';

// Keep in sync with BADGE_FEE_NAIRA in app/src/lib/badge.ts.
const BADGE_FEE_NAIRA = 5000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

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

  const { nin, idDocumentPath } = req.body ?? {};
  if (!nin || typeof nin !== 'string' || nin.length !== 11) {
    return res.status(400).json({ error: 'A valid 11-digit NIN is required' });
  }
  if (!idDocumentPath || typeof idDocumentPath !== 'string') {
    return res.status(400).json({ error: 'An ID document upload is required' });
  }
  // Defense in depth: confirm the uploaded path actually belongs to this user before
  // trusting it, same spirit as the webhook re-verifying charges rather than trusting
  // a client-supplied payload.
  if (!idDocumentPath.startsWith(`${user.id}/`)) {
    return res.status(403).json({ error: 'This document does not belong to your account' });
  }

  const { data: existing } = await supabaseAdmin
    .from('verified_badge_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && (existing.status === 'pending_review' || existing.status === 'approved')) {
    return res.status(409).json({ error: 'You already have a badge request pending or approved' });
  }

  const requestId = randomUUID();
  const { error: insertError } = await supabaseAdmin.from('verified_badge_requests').insert({
    id: requestId,
    user_id: user.id,
    nin,
    id_document_url: idDocumentPath,
    fee_amount: BADGE_FEE_NAIRA,
    status: 'pending_payment',
  });
  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  const reference = `badge_${requestId}_${Date.now()}`;

  const { error: refUpdateError } = await supabaseAdmin
    .from('verified_badge_requests')
    .update({ paystack_reference: reference })
    .eq('id', requestId);
  if (refUpdateError) {
    return res.status(500).json({ error: refUpdateError.message });
  }

  if (!user.email) {
    return res
      .status(400)
      .json({ error: 'Your account needs an email address to pay for the badge.' });
  }

  try {
    const transaction = await initializeTransaction({
      email: user.email,
      amountKobo: BADGE_FEE_NAIRA * 100,
      reference,
      callbackUrl: `${process.env.APP_URL}/settings?badge_payment=complete`,
      metadata: { requestId, userId: user.id },
    });

    return res.status(200).json({ authorizationUrl: transaction.authorization_url });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to start payment with Paystack',
    });
  }
}
