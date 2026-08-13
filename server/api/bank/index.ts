import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../src/cors.js';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { listBanks, resolveAccountNumber, createTransferRecipient } from '../../src/paystack.js';

async function handleListBanks(res: VercelResponse) {
  try {
    const banks = await listBanks();
    return res.status(200).json({ banks: banks.map((b) => ({ name: b.name, code: b.code })) });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to load banks.',
    });
  }
}

async function requireUser(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return null;
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(authHeader.slice('Bearer '.length));

  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return null;
  }

  return user;
}

async function handleResolveAccount(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

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

async function handleSaveAccount(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const { accountNumber, bankCode } = req.body ?? {};
  if (!accountNumber || !bankCode) {
    return res.status(400).json({ error: 'accountNumber and bankCode are required' });
  }

  try {
    // Re-resolve server-side rather than trusting a name the client might pass back —
    // same rule as the webhook re-verifying charges instead of trusting the payload.
    const resolved = await resolveAccountNumber({ accountNumber, bankCode });

    const recipient = await createTransferRecipient({
      name: resolved.account_name,
      accountNumber,
      bankCode,
    });

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        bank_code: bankCode,
        bank_account_number: accountNumber,
        bank_account_name: resolved.account_name,
        paystack_recipient_code: recipient.recipient_code,
      })
      .eq('id', user.id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ accountName: resolved.account_name });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Could not save this bank account.',
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    return handleListBanks(res);
  }

  if (req.method === 'POST') {
    const { action } = req.body ?? {};
    if (action === 'resolve-account') {
      return handleResolveAccount(req, res);
    }
    if (action === 'save-account') {
      return handleSaveAccount(req, res);
    }
    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
