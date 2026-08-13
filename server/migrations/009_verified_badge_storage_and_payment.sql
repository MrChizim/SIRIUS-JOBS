-- Sirius Jobs — Verified Badge: Storage bucket + Paystack payment wiring
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 008).

-- ============================================================
-- Storage bucket for ID documents (private — sensitive PII, never public)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

-- Path convention: {user_id}/{filename} — ownership enforced by checking the first
-- path segment against auth.uid(), the standard Supabase "folder-scoped" pattern.
drop policy if exists "users can upload own id documents" on storage.objects;
create policy "users can upload own id documents" on storage.objects
  for insert
  with check (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can read own id documents" on storage.objects;
create policy "users can read own id documents" on storage.objects
  for select
  using (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No update/delete policy — a resubmission uses a new file path (new request) rather
-- than overwriting evidence tied to a request an admin may need to review.
-- service_role (used by the admin API route to fetch documents for review) bypasses
-- these policies entirely, so no separate admin policy is needed here.

-- ============================================================
-- verified_badge_requests: payment/webhook plumbing
-- ============================================================
alter table public.verified_badge_requests
  add column if not exists paystack_response jsonb;

create unique index if not exists verified_badge_requests_paystack_reference_idx
  on public.verified_badge_requests (paystack_reference)
  where paystack_reference is not null;

-- ============================================================
-- approve_verified_badge() / reject_verified_badge(): atomic admin actions. Not
-- directly reachable from the browser (no grant to anon/authenticated) — the admin
-- API route (server/api/admin/badges/*.ts) calls these via supabaseAdmin, after its
-- own email-allowlist check on the caller.
-- ============================================================
create or replace function public.approve_verified_badge(
  p_request_id uuid,
  p_reviewer_notes text default null
)
returns void as $$
declare
  v_user_id uuid;
  v_status badge_request_status;
begin
  select user_id, status into v_user_id, v_status
    from public.verified_badge_requests where id = p_request_id;

  if v_user_id is null then
    raise exception 'Badge request not found';
  end if;
  if v_status <> 'pending_review' then
    raise exception 'Request is not awaiting review (status: %)', v_status;
  end if;

  update public.verified_badge_requests
    set status = 'approved', reviewer_notes = p_reviewer_notes, reviewed_at = now()
    where id = p_request_id;

  update public.profiles
    set verified_badge = true, nin_verified_at = now()
    where id = v_user_id;
end;
$$ language plpgsql security definer;

revoke execute on function public.approve_verified_badge(uuid, text) from public, anon, authenticated;

create or replace function public.reject_verified_badge(
  p_request_id uuid,
  p_reviewer_notes text default null
)
returns void as $$
begin
  update public.verified_badge_requests
    set status = 'rejected', reviewer_notes = p_reviewer_notes, reviewed_at = now()
    where id = p_request_id and status = 'pending_review';

  if not found then
    raise exception 'Request not found or not awaiting review';
  end if;
end;
$$ language plpgsql security definer;

revoke execute on function public.reject_verified_badge(uuid, text) from public, anon, authenticated;
