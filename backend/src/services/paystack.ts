import axios from 'axios';

const baseURL = 'https://api.paystack.co';

const paystack = axios.create({
  baseURL,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET ?? ''}`,
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
  const { data } = await paystack.post('/transaction/initialize', payload);
  return data;
}

export async function verifyPayment(reference: string) {
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
