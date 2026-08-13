import { supabase } from './supabase';

export const BADGE_FEE_NAIRA = 5000;

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

export async function uploadIdDocument(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to be signed in.');

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('id-documents')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(error.message || 'Could not upload your ID document.');
  return path;
}

export async function startBadgePayment(params: {
  nin: string;
  idDocumentPath: string;
}): Promise<string> {
  const json = await authedFetch('/api/badge/initialize', params);
  return json.authorizationUrl as string;
}

export async function fetchMyBadgeRequest() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('verified_badge_requests')
    .select('id, status, created_at, reviewer_notes')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
