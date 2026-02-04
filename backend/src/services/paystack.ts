import axios from 'axios';

const baseURL = 'https://api.paystack.co';

const rawSecret =
  process.env.PAYSTACK_SECRET ??
  process.env.PAYSTACK_SECRET_KEY ??
  '';

const secret = rawSecret.trim();
const sandboxMode = !secret || /fake|xxxxx/i.test(secret);

const paystack = axios.create({
  baseURL,
  headers: {
    Authorization: `Bearer ${sandboxMode ? '' : secret}`,
    'Content-Type': 'application/json',
  },
});

export type InitializePaymentPayload = {
  email: string;
  amount: number; // in kobo
  reference: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
};

export async function initializePayment(payload: InitializePaymentPayload) {
  if (sandboxMode) {
    return {
      data: {
        authorization_url: `https://checkout.paystack.com/${payload.reference}`,
        access_code: payload.reference,
        reference: payload.reference,
        simulated: true,
      },
    };
  }
  const { data } = await paystack.post('/transaction/initialize', payload);
  return data;
}

export async function verifyPayment(reference: string) {
  if (sandboxMode) {
    return {
      data: {
        status: 'success',
        amount: 300000,
        reference,
        paid_at: new Date().toISOString(),
        simulated: true,
      },
    };
  }
  const { data } = await paystack.get(`/transaction/verify/${reference}`);
  return data;
}

export async function transferPayout(payload: {
  recipient: string;
  amount: number;
  reason?: string;
}) {
  const { data } = await paystack.post('/transfer', payload);
  return data;
}
