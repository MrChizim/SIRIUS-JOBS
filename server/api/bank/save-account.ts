import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { resolveAccountNumber, createTransferRecipient } from '../../src/paystack.js';

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
