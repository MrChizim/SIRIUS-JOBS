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

export type AdminReport = {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  target_type: 'task' | 'user';
  task_id: string | null;
  task_title: string | null;
  reported_user_id: string | null;
  reported_user_name: string | null;
  reason: string;
  status: 'open' | 'reviewed' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

type RawReportRow = {
  id: string;
  reporter_id: string;
  target_type: 'task' | 'user';
  task_id: string | null;
  reported_user_id: string | null;
  reason: string;
  status: 'open' | 'reviewed' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter: { full_name: string | null } | null;
  task: { title: string | null } | null;
  reported_user: { full_name: string | null } | null;
};

export async function fetchReports(): Promise<AdminReport[]> {
  const json = await authedFetch('/api/admin/reports', 'GET');

  return (json.reports as RawReportRow[]).map((r) => ({
    id: r.id,
    reporter_id: r.reporter_id,
    reporter_name: r.reporter?.full_name ?? null,
    target_type: r.target_type,
    task_id: r.task_id,
    task_title: r.task?.title ?? null,
    reported_user_id: r.reported_user_id,
    reported_user_name: r.reported_user?.full_name ?? null,
    reason: r.reason,
    status: r.status,
    admin_notes: r.admin_notes,
    created_at: r.created_at,
    resolved_at: r.resolved_at,
  }));
}

export async function decideReport(
  reportId: string,
  decision: 'reviewed' | 'dismissed',
  notes?: string,
): Promise<void> {
  await authedFetch('/api/admin/reports', 'POST', { reportId, decision, notes });
}
