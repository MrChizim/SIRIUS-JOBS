const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('Missing PAYSTACK_SECRET_KEY environment variable.');
  return key;
}

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<PaystackInitializeResponse['data']> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const json = (await res.json()) as PaystackInitializeResponse;

  if (!res.ok || !json.status) {
    throw new Error(json.message || 'Failed to initialize Paystack transaction.');
  }

  return json.data;
}

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    metadata: Record<string, unknown>;
  };
};

export async function verifyTransaction(
  reference: string,
): Promise<PaystackVerifyResponse['data']> {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey()}` } },
  );

  const json = (await res.json()) as PaystackVerifyResponse;

  if (!res.ok || !json.status) {
    throw new Error(json.message || 'Failed to verify Paystack transaction.');
  }

  return json.data;
}
