-- Sirius Jobs — initial schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

-- ============================================================
-- Enums
-- ============================================================

do $$ begin
  create type task_path as enum ('escrow', 'lead_fee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('open', 'bidding_closed', 'in_progress', 'completed', 'cancelled', 'disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bid_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('purchased', 'contacted', 'won', 'lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type escrow_status as enum ('pending', 'held', 'released', 'refunded', 'disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_status as enum ('open', 'resolved', 'escalated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('poster', 'tasker', 'both');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Reference table: categories -> payment path
-- ============================================================

create table if not exists public.categories (
  slug text primary key,
  label text not null,
  path task_path not null
);

insert into public.categories (slug, label, path) values
  ('cleaning', 'Cleaning', 'escrow'),
  ('moving_delivery', 'Moving / Delivery', 'escrow'),
  ('handyman', 'Handyman / Small Repairs', 'escrow'),
  ('errands', 'Errands', 'escrow'),
  ('gardening', 'Gardening', 'escrow'),
  ('furniture_assembly', 'Furniture Assembly', 'escrow'),
  ('plumbing', 'Plumbing', 'lead_fee'),
  ('electrical', 'Electrical', 'lead_fee'),
  ('building_construction', 'Building / Construction', 'lead_fee'),
  ('painting', 'Painting', 'lead_fee'),
  ('ac_appliance_repair', 'AC / Appliance Repair', 'lead_fee'),
  ('interior_design', 'Interior Design', 'lead_fee')
on conflict (slug) do update set label = excluded.label, path = excluded.path;

-- ============================================================
-- profiles (extends auth.users)
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  whatsapp text,
  role user_role not null default 'poster',
  city text,
  verified_badge boolean not null default false,
  nin_verified_at timestamptz,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  completion_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- tasks
-- ============================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  category_slug text not null references public.categories (slug),
  path task_path not null,
  budget_min numeric(12, 2),
  budget_max numeric(12, 2),
  location_text text,
  city text,
  status task_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_poster_id_idx on public.tasks (poster_id);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_path_idx on public.tasks (path);
create index if not exists tasks_city_idx on public.tasks (city);

-- Auto-fill task.path from the category's path so the app never has to send it
create or replace function public.set_task_path()
returns trigger as $$
begin
  select path into new.path from public.categories where slug = new.category_slug;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_task_path_trigger on public.tasks;
create trigger set_task_path_trigger
  before insert or update of category_slug on public.tasks
  for each row execute procedure public.set_task_path();

-- ============================================================
-- bids (escrow-path tasks)
-- ============================================================

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  tasker_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null,
  message text,
  status bid_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (task_id, tasker_id)
);

create index if not exists bids_task_id_idx on public.bids (task_id);
create index if not exists bids_tasker_id_idx on public.bids (tasker_id);

-- ============================================================
-- leads (lead-fee-path tasks)
-- ============================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  lead_fee_charged numeric(12, 2) not null,
  status lead_status not null default 'purchased',
  created_at timestamptz not null default now(),
  unique (task_id, professional_id)
);

create index if not exists leads_task_id_idx on public.leads (task_id);
create index if not exists leads_professional_id_idx on public.leads (professional_id);

-- ============================================================
-- escrow_transactions (escrow-path only, mirrors Paystack split-payment state)
-- ============================================================

create table if not exists public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  bid_id uuid not null references public.bids (id) on delete cascade,
  paystack_reference text unique,
  paystack_subaccount_code text,
  amount numeric(12, 2) not null,
  commission_amount numeric(12, 2) not null default 0,
  payout_amount numeric(12, 2) not null,
  status escrow_status not null default 'pending',
  held_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists escrow_transactions_task_id_idx on public.escrow_transactions (task_id);

-- ============================================================
-- lead_payments (lead-fee-path only, one-off Paystack charges)
-- ============================================================

create table if not exists public.lead_payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  paystack_reference text unique,
  amount numeric(12, 2) not null,
  status payment_status not null default 'paid',
  created_at timestamptz not null default now()
);

create index if not exists lead_payments_lead_id_idx on public.lead_payments (lead_id);

-- ============================================================
-- reviews
-- ============================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (task_id, reviewer_id)
);

create index if not exists reviews_reviewee_id_idx on public.reviews (reviewee_id);

-- ============================================================
-- disputes
-- ============================================================

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  raised_by uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  status dispute_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists disputes_task_id_idx on public.disputes (task_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.bids enable row level security;
alter table public.leads enable row level security;
alter table public.escrow_transactions enable row level security;
alter table public.lead_payments enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;

-- categories: public read, no writes from clients
drop policy if exists "categories are publicly readable" on public.categories;
create policy "categories are publicly readable" on public.categories
  for select using (true);

-- profiles: anyone can read (needed to show tasker/poster names & ratings publicly),
-- only the owner can update their own row
drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable" on public.profiles
  for select using (true);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- tasks: open tasks are publicly readable; posters can manage their own tasks
drop policy if exists "open tasks are publicly readable" on public.tasks;
create policy "open tasks are publicly readable" on public.tasks
  for select using (status = 'open' or poster_id = auth.uid());

drop policy if exists "posters can insert own tasks" on public.tasks;
create policy "posters can insert own tasks" on public.tasks
  for insert with check (poster_id = auth.uid());

drop policy if exists "posters can update own tasks" on public.tasks;
create policy "posters can update own tasks" on public.tasks
  for update using (poster_id = auth.uid());

-- bids: visible to the bidder and the task's poster; taskers can create their own bids
drop policy if exists "bids visible to bidder and task poster" on public.bids;
create policy "bids visible to bidder and task poster" on public.bids
  for select using (
    tasker_id = auth.uid()
    or exists (select 1 from public.tasks t where t.id = task_id and t.poster_id = auth.uid())
  );

drop policy if exists "taskers can create own bids" on public.bids;
create policy "taskers can create own bids" on public.bids
  for insert with check (tasker_id = auth.uid());

drop policy if exists "taskers can update own bids" on public.bids;
create policy "taskers can update own bids" on public.bids
  for update using (tasker_id = auth.uid());

-- leads: visible only to the professional who purchased it and the task's poster
drop policy if exists "leads visible to purchaser and task poster" on public.leads;
create policy "leads visible to purchaser and task poster" on public.leads
  for select using (
    professional_id = auth.uid()
    or exists (select 1 from public.tasks t where t.id = task_id and t.poster_id = auth.uid())
  );

-- escrow_transactions: visible only to the task's poster and the accepted bidder
drop policy if exists "escrow visible to task participants" on public.escrow_transactions;
create policy "escrow visible to task participants" on public.escrow_transactions
  for select using (
    exists (
      select 1 from public.tasks t
      join public.bids b on b.id = bid_id
      where t.id = task_id and (t.poster_id = auth.uid() or b.tasker_id = auth.uid())
    )
  );

-- lead_payments: visible only to the professional who made the payment
drop policy if exists "lead payments visible to payer" on public.lead_payments;
create policy "lead payments visible to payer" on public.lead_payments
  for select using (
    exists (select 1 from public.leads l where l.id = lead_id and l.professional_id = auth.uid())
  );

-- reviews: publicly readable (they're social proof), only the reviewer can write their own
drop policy if exists "reviews are publicly readable" on public.reviews;
create policy "reviews are publicly readable" on public.reviews
  for select using (true);

drop policy if exists "reviewer can insert own review" on public.reviews;
create policy "reviewer can insert own review" on public.reviews
  for insert with check (reviewer_id = auth.uid());

-- disputes: visible only to the task's poster and the person who raised it
drop policy if exists "disputes visible to participants" on public.disputes;
create policy "disputes visible to participants" on public.disputes
  for select using (
    raised_by = auth.uid()
    or exists (select 1 from public.tasks t where t.id = task_id and t.poster_id = auth.uid())
  );

drop policy if exists "users can raise disputes" on public.disputes;
create policy "users can raise disputes" on public.disputes
  for insert with check (raised_by = auth.uid());
