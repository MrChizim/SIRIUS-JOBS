-- Sirius Jobs — notify the admin (via the existing notification bell) when something
-- needs their attention, and add a report-a-task/user feature.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 020).
--
-- Until now, disputes and badge-payment requests only ever showed up if the admin
-- happened to check /admin — no signal fires when one arrives. This reuses the same
-- notifications table/bell already used for bids/messages/leads (see 008, 019),
-- rather than adding a new delivery mechanism.

-- ============================================================
-- admin_user_id(): resolves the single admin's profile id by email, matching the
-- allowlist in server/src/adminAuth.ts. Looked up by email each time (not cached in a
-- column) so this and adminAuth.ts can never disagree about who the admin is.
-- ============================================================
create or replace function public.admin_user_id()
returns uuid as $$
  select id from auth.users where email = 'siriusoddjobs@gmail.com' limit 1;
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- Dispute raised -> also notify the admin (notify_on_dispute_raised from 011 already
-- notifies the other participant; this adds the admin as a second recipient).
-- ============================================================
create or replace function public.notify_admin_on_dispute_raised()
returns trigger as $$
declare
  v_task_title text;
  v_admin_id uuid;
begin
  v_admin_id := public.admin_user_id();
  if v_admin_id is null then
    return new;
  end if;

  select title into v_task_title from public.tasks where id = new.task_id;

  insert into public.notifications (user_id, kind, task_id, body)
  values (v_admin_id, 'admin_dispute_raised', new.task_id, 'New dispute: "' || v_task_title || '"');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_dispute_created_notify_admin on public.disputes;
create trigger on_dispute_created_notify_admin
  after insert on public.disputes
  for each row execute function public.notify_admin_on_dispute_raised();

-- ============================================================
-- Badge request reaches pending_review (payment confirmed, ready for the admin to
-- actually review the ID/NIN) -> notify the admin. Not on insert — a request starts
-- at pending_payment and is worthless to review before payment clears.
-- ============================================================
create or replace function public.notify_admin_on_badge_pending_review()
returns trigger as $$
declare
  v_admin_id uuid;
  v_name text;
begin
  if new.status = 'pending_review' and old.status is distinct from 'pending_review' then
    v_admin_id := public.admin_user_id();
    if v_admin_id is null then
      return new;
    end if;

    select full_name into v_name from public.profiles where id = new.user_id;

    insert into public.notifications (user_id, kind, task_id, body)
    values (v_admin_id, 'admin_badge_review', null, 'Verified Badge payment received from ' || coalesce(v_name, 'a user'));
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_badge_request_updated_notify_admin on public.verified_badge_requests;
create trigger on_badge_request_updated_notify_admin
  after update on public.verified_badge_requests
  for each row execute function public.notify_admin_on_badge_pending_review();

-- Also cover a request inserted directly as pending_review (defensive, mirrors the
-- same reasoning as 019's lead-purchased insert trigger).
drop trigger if exists on_badge_request_created_notify_admin on public.verified_badge_requests;
create trigger on_badge_request_created_notify_admin
  after insert on public.verified_badge_requests
  for each row
  when (new.status = 'pending_review')
  execute function public.notify_admin_on_badge_pending_review();

-- ============================================================
-- reports: flag a task or a user for admin attention (spam, scam, abusive behavior,
-- fraudulent task, etc). Deliberately simple — no auto-consequence to the reported
-- task/user, just a queue the admin reviews, same spirit as disputes.
-- ============================================================
do $$ begin
  create type report_target_type as enum ('task', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewed', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type report_target_type not null,
  task_id uuid references public.tasks (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reason text not null,
  status report_status not null default 'open',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (target_type = 'task' and task_id is not null and reported_user_id is null)
    or (target_type = 'user' and reported_user_id is not null and task_id is null)
  )
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- A reporter can see their own past reports (so the UI can show "already reported");
-- only the admin can see everything (enforced at the API layer via supabaseAdmin,
-- same pattern as disputes/badges admin routes — no separate admin SELECT policy
-- needed here since that path bypasses RLS entirely).
drop policy if exists "users can view their own reports" on public.reports;
create policy "users can view their own reports" on public.reports
  for select using (reporter_id = auth.uid());

drop policy if exists "users can file reports" on public.reports;
create policy "users can file reports" on public.reports
  for insert
  with check (
    reporter_id = auth.uid()
    and length(trim(reason)) >= 10
  );

-- New report -> notify the admin immediately, same urgency as a dispute.
create or replace function public.notify_admin_on_report_created()
returns trigger as $$
declare
  v_admin_id uuid;
  v_label text;
begin
  v_admin_id := public.admin_user_id();
  if v_admin_id is null then
    return new;
  end if;

  if new.target_type = 'task' then
    select 'Task reported: "' || title || '"' into v_label
      from public.tasks where id = new.task_id;
  else
    select 'User reported: ' || coalesce(full_name, 'a user') into v_label
      from public.profiles where id = new.reported_user_id;
  end if;

  insert into public.notifications (user_id, kind, task_id, body)
  values (v_admin_id, 'admin_report_created', new.task_id, coalesce(v_label, 'New report submitted'));

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_report_created_notify_admin on public.reports;
create trigger on_report_created_notify_admin
  after insert on public.reports
  for each row execute function public.notify_admin_on_report_created();
