import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../src/cors.js';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { resolveAccountNumber } from '../../src/paystack.js';

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

  const { accountNumber, bankCode } = req.body ?? {};
  if (!accountNumber || !bankCode) {
    return res.status(400).json({ error: 'accountNumber and bankCode are required' });
  }

  try {
    const resolved = await resolveAccountNumber({ accountNumber, bankCode });
    return res.status(200).json({ accountName: resolved.account_name });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Could not verify this bank account.',
    });
  }
}
