import { supabase } from './supabase';

async function authedFetch(path: string) {
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
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Something went wrong.');
  }

  return json;
}

export type PlatformStats = {
  userCount: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOpen: number;
  topCategories: { label: string; count: number }[];
  totalVolume: number;
  totalCommission: number;
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  return authedFetch('/api/admin/stats');
}
