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

export type BadgeRequest = {
  id: string;
  user_id: string;
  nin: string;
  id_document_url: string;
  fee_amount: number;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles: { full_name: string | null } | null;
};

export async function fetchBadgeRequests(): Promise<BadgeRequest[]> {
  const json = await authedFetch('/api/admin/badges', 'GET');
  return json.requests;
}

export async function getDocumentSignedUrl(path: string): Promise<string> {
  const json = await authedFetch('/api/admin/badges', 'POST', { action: 'document-url', path });
  return json.url;
}

export async function decideBadgeRequest(
  requestId: string,
  decision: 'approve' | 'reject',
  notes?: string,
): Promise<void> {
  await authedFetch('/api/admin/badges', 'POST', { requestId, decision, notes });
}
