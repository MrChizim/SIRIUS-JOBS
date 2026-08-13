import { supabaseAdmin } from './supabaseAdmin.js';

// Single-founder company — a hardcoded allowlist is simpler and safer than building
// a roles/permissions system for what is currently one admin user. Add more emails
// here if/when a second admin is needed.
const ADMIN_EMAILS = ['siriusoddjobs@gmail.com'];

export async function requireAdmin(authHeader: string | undefined): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing authorization token' };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(authHeader.slice('Bearer '.length));

  if (error || !user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    return { ok: false, status: 403, error: 'Not authorized' };
  }

  return { ok: true };
}
