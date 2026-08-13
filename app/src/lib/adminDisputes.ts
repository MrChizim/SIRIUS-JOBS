import { supabase } from './supabase';

async function authedFetch(path: string, method: 'GET' | 'POST', body?: unknown) {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error('The admin API is not configured yet.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You need to be signed in.');
  }

  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Something went wrong.');
  }

  return json;
}

export type AdminDispute = {
  id: string;
  task_id: string;
  raised_by: string;
  reason: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  task_title: string;
  task_status: string;
  poster_name: string | null;
  tasker_id: string | null;
  tasker_name: string | null;
  amount: number;
  payout_amount: number;
  raised_by_role: 'poster' | 'tasker';
};

type RawDisputeRow = {
  id: string;
  task_id: string;
  raised_by: string;
  reason: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  tasks: {
    title: string;
    status: string;
    poster_id: string;
    profiles: { full_name: string | null } | null;
    escrow_transactions: { amount: number; payout_amount: number }[];
    bids: { tasker_id: string; status: string; profiles: { full_name: string | null } | null }[];
  } | null;
};

export async function fetchDisputes(): Promise<AdminDispute[]> {
  const json = await authedFetch('/api/admin/disputes/list', 'GET');

  return (json.disputes as RawDisputeRow[]).map((d) => {
    const acceptedBid = (d.tasks?.bids ?? []).find((b) => b.status === 'accepted');
    const escrowTxn = (d.tasks?.escrow_transactions ?? [])[0];
    return {
      id: d.id,
      task_id: d.task_id,
      raised_by: d.raised_by,
      reason: d.reason,
      status: d.status,
      resolution_notes: d.resolution_notes,
      created_at: d.created_at,
      resolved_at: d.resolved_at,
      task_title: d.tasks?.title ?? 'Untitled task',
      task_status: d.tasks?.status ?? 'unknown',
      poster_name: d.tasks?.profiles?.full_name ?? null,
      tasker_id: acceptedBid?.tasker_id ?? null,
      tasker_name: acceptedBid?.profiles?.full_name ?? null,
      amount: escrowTxn?.amount ?? 0,
      payout_amount: escrowTxn?.payout_amount ?? 0,
      raised_by_role: d.raised_by === d.tasks?.poster_id ? 'poster' : 'tasker',
    };
  });
}

export async function decideDispute(
  disputeId: string,
  decision: 'release_to_tasker' | 'refund_to_poster',
  notes: string,
): Promise<void> {
  await authedFetch('/api/admin/disputes/decide', 'POST', { disputeId, decision, notes });
}
