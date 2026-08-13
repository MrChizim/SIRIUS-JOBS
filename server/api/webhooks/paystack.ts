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

async function handleLeadCharge(reference: string) {
  const { data: payment } = await supabaseAdmin
    .from('lead_payments')
    .select('id, status, lead_id, amount')
    .eq('paystack_reference', reference)
    .maybeSingle();

  if (!payment) {
    // Unknown reference — don't 500 (Paystack would keep retrying forever), just log
    // and acknowledge. Could be a transaction from a different integration/test.
    console.warn('Paystack webhook: no matching lead_payments row for reference', reference);
    return;
  }

  if (payment.status === 'paid') {
    // Already processed (webhook delivered twice) — acknowledge, don't double-apply.
    return;
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
    return;
  }

  const expectedKobo = Math.round(Number(payment.amount) * 100);
  if (verified.amount !== expectedKobo) {
    console.error('Paystack webhook: amount mismatch, refusing to mark as paid', {
      reference,
      expectedKobo,
      verifiedAmount: verified.amount,
    });
    return;
  }

  const { error: paymentUpdateError } = await supabaseAdmin
    .from('lead_payments')
    .update({ status: 'paid', paystack_response: verified })
    .eq('id', payment.id)
    .eq('status', 'pending');

  if (paymentUpdateError) {
    console.error('Paystack webhook: failed to update lead_payments', paymentUpdateError);
    return;
  }

  await supabaseAdmin
    .from('leads')
    .update({ status: 'purchased' })
    .eq('id', payment.lead_id)
    .eq('status', 'pending_payment');

  console.info('Lead payment confirmed', { reference, leadId: payment.lead_id });
}

async function handleEscrowCharge(reference: string) {
  const { data: txn } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, status, amount, bid_id')
    .eq('paystack_reference', reference)
    .maybeSingle();

  if (!txn) {
    console.warn(
      'Paystack webhook: no matching escrow_transactions row for reference',
      reference,
    );
    return;
  }

  if (txn.status !== 'charge_pending') {
    // Already held/further along, or was never sent to Paystack — don't double-apply.
    return;
  }

  const verified = await verifyTransaction(reference);

  if (verified.status !== 'success') {
    console.warn('Paystack webhook: escrow verify did not confirm success', {
      reference,
      verifiedStatus: verified.status,
    });
    return;
  }

  const expectedKobo = Math.round(Number(txn.amount) * 100);
  if (verified.amount !== expectedKobo) {
    console.error('Paystack webhook: escrow amount mismatch, refusing to mark as held', {
      reference,
      expectedKobo,
      verifiedAmount: verified.amount,
    });
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('escrow_transactions')
    .update({
      status: 'held',
      held_at: new Date().toISOString(),
      paystack_charge_response: verified,
    })
    .eq('id', txn.id)
    .eq('status', 'charge_pending');

  if (updateError) {
    console.error('Paystack webhook: failed to update escrow_transactions', updateError);
    return;
  }

  // Only now does the bid actually get accepted / other bids get rejected / the task
  // move to in_progress — money must be confirmed held first.
  const { error: finalizeError } = await supabaseAdmin.rpc('finalize_bid_acceptance', {
    p_bid_id: txn.bid_id,
  });

  if (finalizeError) {
    console.error(
      'Paystack webhook: finalize_bid_acceptance failed after charge confirmed',
      finalizeError,
    );
    return;
  }

  console.info('Escrow charge confirmed, bid accepted', { reference, bidId: txn.bid_id });
}

async function handleTransferEvent(eventName: string, data: Record<string, unknown>) {
  const transferCode = data?.transfer_code;
  if (!transferCode || typeof transferCode !== 'string') return;

  const { data: txn } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, status')
    .eq('paystack_transfer_code', transferCode)
    .maybeSingle();

  if (!txn) {
    console.warn('Paystack webhook: no matching escrow_transactions row for transfer', transferCode);
    return;
  }

  if (eventName === 'transfer.success') {
    if (txn.status !== 'payout_pending') return; // already processed or unexpected state

    await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        paystack_transfer_response: data,
      })
      .eq('id', txn.id)
      .eq('status', 'payout_pending');

    console.info('Escrow payout released', { transferCode });
    return;
  }

  // transfer.failed or transfer.reversed — money did not reach the tasker. Reuse
  // 'disputed' to flag this for manual ops follow-up rather than leaving it
  // payout_pending forever — that status already means "needs human attention" here.
  await supabaseAdmin
    .from('escrow_transactions')
    .update({
      status: 'disputed',
      failure_reason: typeof data?.reason === 'string' ? data.reason : eventName,
      paystack_transfer_response: data,
    })
    .eq('id', txn.id);

  console.error('Escrow payout failed, needs manual review', {
    transferCode,
    eventName,
    reason: data?.reason,
  });
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

    if (event?.event === 'charge.success' && event?.data?.status === 'success') {
      const { reference } = event.data;
      if (!reference || typeof reference !== 'string') {
        console.warn('Paystack webhook: charge.success with no reference', event.data);
        return res.status(200).json({ received: true });
      }

      if (reference.startsWith('lead_')) {
        await handleLeadCharge(reference);
      } else if (reference.startsWith('escrow_')) {
        await handleEscrowCharge(reference);
      } else {
        console.warn('Paystack webhook: charge.success with unrecognized reference prefix', reference);
      }

      return res.status(200).json({ received: true });
    }

    if (
      event?.event === 'transfer.success' ||
      event?.event === 'transfer.failed' ||
      event?.event === 'transfer.reversed'
    ) {
      await handleTransferEvent(event.event, event.data ?? {});
      return res.status(200).json({ received: true });
    }

    // Acknowledge anything we don't act on so Paystack doesn't keep retrying it.
    return res.status(200).json({ received: true });
  } catch (err) {
    // Any unexpected shape/parsing error: log it, but still 200 so Paystack doesn't
    // retry a payload it will never successfully process. Real failures show up in
    // logs instead of an infinite retry loop.
    console.error('Paystack webhook: unhandled error', err);
    return res.status(200).json({ received: true });
  }
}
