-- Sirius Jobs — Verified Badge requests
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 004_messages.sql)

-- One-time paid verification: user submits NIN + a form of ID, pays a fee, an admin
-- reviews and approves/rejects. Approval flips profiles.verified_badge and stamps
-- profiles.nin_verified_at (both columns already existed unused since 001_initial_schema.sql).
-- Payment integration (Paystack) is out of scope here — paid_at is set once that's wired
-- up; for now the request can exist in 'pending_payment' until that's built.

do $$ begin
  create type badge_request_status as enum (
    'pending_payment',
    'pending_review',
    'approved',
    'rejected'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.verified_badge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nin text not null,
  id_document_url text not null,
  fee_amount numeric(12, 2) not null,
  paystack_reference text,
  paid_at timestamptz,
  status badge_request_status not null default 'pending_payment',
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verified_badge_requests_user_id_idx
  on public.verified_badge_requests (user_id);

alter table public.verified_badge_requests enable row level security;

-- A user can see and create their own requests only. Reviewing/approving is an admin
-- action — no client-side policy for that; it happens via the service_role key from
-- trusted server code once the review/payment flow is actually built.
drop policy if exists "users can view own badge requests" on public.verified_badge_requests;
create policy "users can view own badge requests" on public.verified_badge_requests
  for select using (user_id = auth.uid());

drop policy if exists "users can create own badge requests" on public.verified_badge_requests;
create policy "users can create own badge requests" on public.verified_badge_requests
  for insert with check (user_id = auth.uid());
