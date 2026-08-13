import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '../../src/supabaseAdmin.js';
import { verifyTransaction } from '../../src/paystack.js';

export const config = {
  api: {
    // Signature verification needs the exact raw request body, not Vercel's
    // auto-parsed JSON — re-serializing a parsed object can produce different bytes
    // (key order, whitespace) and make a legitimate signature fail to verify.
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function isValidSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-paystack-signature'] as string | undefined;

    if (!isValidSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody);

    if (event?.event !== 'charge.success' || event?.data?.status !== 'success') {
      // Acknowledge anything we don't act on so Paystack doesn't keep retrying it.
      return res.status(200).json({ received: true });
    }

    const { reference } = event.data;
    if (!reference || typeof reference !== 'string') {
      console.warn('Paystack webhook: charge.success with no reference', event.data);
      return res.status(200).json({ received: true });
    }

    const { data: payment } = await supabaseAdmin
      .from('lead_payments')
      .select('id, status, lead_id, amount')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (!payment) {
      // Unknown reference — don't 500 (Paystack would keep retrying forever), just log
      // and acknowledge. Could be a transaction from a different integration/test.
      console.warn('Paystack webhook: no matching lead_payments row for reference', reference);
      return res.status(200).json({ received: true });
    }

    if (payment.status === 'paid') {
      // Already processed (webhook delivered twice) — acknowledge, don't double-apply.
      return res.status(200).json({ received: true });
    }

    // The webhook signature proves the request came from Paystack, but a webhook
    // payload alone is still just "Paystack says X happened." Cross-check against
    // Paystack's own transaction record via a server-initiated call before treating
    // this as authoritative — defense in depth in case a secret is ever reused
    // across environments, and it also confirms the amount actually charged.
    const verified = await verifyTransaction(reference);

    if (verified.status !== 'success') {
      console.warn('Paystack webhook: verify call did not confirm success', {
        reference,
        verifiedStatus: verified.status,
      });
      return res.status(200).json({ received: true });
    }

    const expectedKobo = Math.round(Number(payment.amount) * 100);
    if (verified.amount !== expectedKobo) {
      console.error('Paystack webhook: amount mismatch, refusing to mark as paid', {
        reference,
        expectedKobo,
        verifiedAmount: verified.amount,
      });
      return res.status(200).json({ received: true });
    }

    const { error: paymentUpdateError } = await supabaseAdmin
      .from('lead_payments')
      .update({ status: 'paid', paystack_response: verified })
      .eq('id', payment.id)
      .eq('status', 'pending');

    if (paymentUpdateError) {
      console.error('Paystack webhook: failed to update lead_payments', paymentUpdateError);
      return res.status(200).json({ received: true });
    }

    await supabaseAdmin
      .from('leads')
      .update({ status: 'purchased' })
      .eq('id', payment.lead_id)
      .eq('status', 'pending_payment');

    console.info('Lead payment confirmed', { reference, leadId: payment.lead_id });

    return res.status(200).json({ received: true });
  } catch (err) {
    // Any unexpected shape/parsing error: log it, but still 200 so Paystack doesn't
    // retry an payload it will never successfully process. Real failures show up in
    // logs instead of an infinite retry loop.
    console.error('Paystack webhook: unhandled error', err);
    return res.status(200).json({ received: true });
  }
}
