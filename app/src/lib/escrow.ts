import { supabase } from './supabase';

async function authedFetch(path: string, body: unknown) {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error('Payments are not configured yet. Please try again later.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You need to be signed in.');
  }

  const res = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Something went wrong. Please try again.');
  }

  return json;
}

export async function startBidAcceptance(bidId: string): Promise<string> {
  const json = await authedFetch('/api/escrow/accept', { bidId });
  return json.authorizationUrl as string;
}

export async function completeEscrowTask(taskId: string): Promise<void> {
  await authedFetch('/api/escrow/complete', { taskId });
}

export async function resolveBankAccount(params: {
  accountNumber: string;
  bankCode: string;
}): Promise<string> {
  const json = await authedFetch('/api/bank', { action: 'resolve-account', ...params });
  return json.accountName as string;
}

export async function saveBankAccount(params: {
  accountNumber: string;
  bankCode: string;
}): Promise<string> {
  const json = await authedFetch('/api/bank', { action: 'save-account', ...params });
  return json.accountName as string;
}

export async function fetchBanks(): Promise<{ name: string; code: string }[]> {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error('Payments are not configured yet. Please try again later.');
  }

  const res = await fetch(`${apiUrl}/api/bank`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Failed to load banks.');
  }

  return json.banks;
}
