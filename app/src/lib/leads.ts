import { supabase } from './supabase';

export async function startLeadPayment(taskId: string): Promise<string> {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error('Payments are not configured yet. Please try again later.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You need to be signed in to purchase a lead.');
  }

  const res = await fetch(`${apiUrl}/api/leads/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ taskId }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Could not start payment. Please try again.');
  }

  return json.authorizationUrl as string;
}
