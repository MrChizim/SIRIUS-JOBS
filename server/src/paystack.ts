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

type PaystackResolveAccountResponse = {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
};

export async function resolveAccountNumber(params: {
  accountNumber: string;
  bankCode: string;
}): Promise<PaystackResolveAccountResponse['data']> {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(
      params.accountNumber,
    )}&bank_code=${encodeURIComponent(params.bankCode)}`,
    { headers: { Authorization: `Bearer ${secretKey()}` } },
  );

  const json = (await res.json()) as PaystackResolveAccountResponse;

  if (!res.ok || !json.status) {
    throw new Error(json.message || 'Could not verify this bank account.');
  }

  return json.data;
}

type PaystackRecipientResponse = {
  status: boolean;
  message: string;
  data: {
    recipient_code: string;
    active: boolean;
  };
};

export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<PaystackRecipientResponse['data']> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'nuban',
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: 'NGN',
    }),
  });

  const json = (await res.json()) as PaystackRecipientResponse;

  if (!res.ok || !json.status) {
    throw new Error(json.message || 'Could not register this bank account for payouts.');
  }

  return json.data;
}

type PaystackTransferResponse = {
  status: boolean;
  message: string;
  data: {
    transfer_code: string;
    status: string;
    reference: string;
  };
};

export async function initiateTransfer(params: {
  amountKobo: number;
  recipientCode: string;
  reference: string;
  reason: string;
}): Promise<PaystackTransferResponse['data']> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: params.amountKobo,
      recipient: params.recipientCode,
      reference: params.reference,
      reason: params.reason,
    }),
  });

  const json = (await res.json()) as PaystackTransferResponse;

  if (!res.ok || !json.status) {
    throw new Error(json.message || 'Failed to initiate payout transfer.');
  }

  return json.data;
}

type PaystackBank = { name: string; code: string; slug: string };
type PaystackListBanksResponse = { status: boolean; message: string; data: PaystackBank[] };

export async function listBanks(): Promise<PaystackBank[]> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/bank?country=nigeria&currency=NGN`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });

  const json = (await res.json()) as PaystackListBanksResponse;

  if (!res.ok || !json.status) {
    throw new Error(json.message || 'Failed to load bank list.');
  }

  return json.data;
}

type PaystackRefundResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    amount: number;
    transaction: { reference: string };
  };
};

export async function refundTransaction(params: {
  reference: string;
  amountKobo?: number; // omit to refund the full original charge
}): Promise<PaystackRefundResponse['data']> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transaction: params.reference,
      ...(params.amountKobo ? { amount: params.amountKobo } : {}),
    }),
  });

  const json = (await res.json()) as PaystackRefundResponse;

  if (!res.ok || !json.status) {
    throw new Error(json.message || 'Failed to process Paystack refund.');
  }

  return json.data;
}
