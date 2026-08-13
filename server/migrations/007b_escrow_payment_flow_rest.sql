-- Sirius Jobs — real escrow payment flow support (part 2 of 2)
-- Run this AFTER 007a_escrow_payment_flow_enums.sql has been run and committed.
--
-- IMPORTANT: this migration drops accept_bid(uuid) and mark_task_complete(uuid),
-- the two RPCs the current frontend calls directly for the escrow path. Deploy the
-- matching frontend change (MyTasks.tsx switching to the new server/api/escrow/*
-- endpoints) in the same window as this migration — between the two, accepting a
-- bid or marking a task complete on the escrow path will fail.

-- ============================================================
-- profiles: tasker payout bank details (one account per tasker)
-- ============================================================
alter table public.profiles add column if not exists bank_code text;
alter table public.profiles add column if not exists bank_account_number text;
alter table public.profiles add column if not exists bank_account_name text;
alter table public.profiles add column if not exists paystack_recipient_code text;

-- bank_account_name and paystack_recipient_code must only ever be written by trusted
-- server code (server/api/bank/save-account.ts, via service_role) — a client could
-- otherwise self-report a fake verified name. There's no column-level RLS here (this
-- schema doesn't use that feature elsewhere either); the existing "users can update
-- own profile" policy still allows a client to write bank_code/bank_account_number
-- directly, but the app never does this from the client, only through the API route
-- that re-verifies via Paystack first.

-- ============================================================
-- escrow_transactions: track the Paystack charge + transfer lifecycle
-- ============================================================
alter table public.escrow_transactions add column if not exists poster_id uuid references public.profiles (id);
alter table public.escrow_transactions add column if not exists tasker_id uuid references public.profiles (id);
alter table public.escrow_transactions add column if not exists paystack_charge_response jsonb;
alter table public.escrow_transactions add column if not exists paystack_transfer_code text;
alter table public.escrow_transactions add column if not exists paystack_transfer_response jsonb;
alter table public.escrow_transactions add column if not exists failure_reason text;

create index if not exists escrow_transactions_paystack_reference_idx
  on public.escrow_transactions (paystack_reference);
create index if not exists escrow_transactions_bid_id_idx
  on public.escrow_transactions (bid_id);

-- ============================================================
-- accept_bid(): the old version flipped task/bid status directly and was callable
-- from the browser. Money must be confirmed held BEFORE any of that happens now, so
-- the direct-flip logic moves into a service_role-only function invoked from the
-- webhook handler after charge.success is confirmed (mirrors leads.status only
-- becoming 'purchased' inside the webhook, never from client code).
-- ============================================================
drop function if exists public.accept_bid(uuid);

create or replace function public.finalize_bid_acceptance(p_bid_id uuid)
returns void as $$
declare
  v_task_id uuid;
begin
  select task_id into v_task_id from public.bids where id = p_bid_id;

  if v_task_id is null then
    raise exception 'Bid not found';
  end if;

  update public.tasks
    set status = 'in_progress'
    where id = v_task_id and status = 'open';

  update public.bids
    set status = 'accepted'
    where id = p_bid_id and status = 'pending';

  update public.bids
    set status = 'rejected'
    where task_id = v_task_id and id <> p_bid_id and status = 'pending';
end;
$$ language plpgsql security definer;

-- service_role bypasses grants entirely, so it can still call this via .rpc() from
-- supabaseAdmin — this revoke is what stops a signed-in browser user from calling it
-- directly and skipping payment.
revoke execute on function public.finalize_bid_acceptance(uuid) from public, anon, authenticated;

-- The old "taskers can withdraw own pending bids" policy from 002_accept_bid.sql is
-- unaffected — it only ever allowed pending->withdrawn, never touched acceptance.

-- ============================================================
-- mark_task_complete(): replaced by finalize_task_completion(), which takes the
-- poster id as an explicit argument instead of trusting auth.uid() — a service_role
-- call has no JWT, so auth.uid() would evaluate to null and always fail the old
-- function's internal check.
-- ============================================================
drop function if exists public.mark_task_complete(uuid);

create or replace function public.finalize_task_completion(p_task_id uuid, p_poster_id uuid)
returns void as $$
declare
  v_poster_id uuid;
  v_accepted_tasker_id uuid;
begin
  select poster_id into v_poster_id from public.tasks where id = p_task_id;

  if v_poster_id is null or v_poster_id <> p_poster_id then
    raise exception 'Task not found or poster mismatch';
  end if;

  select tasker_id into v_accepted_tasker_id
    from public.bids
    where task_id = p_task_id and status = 'accepted'
    limit 1;

  if v_accepted_tasker_id is null then
    raise exception 'This task has no accepted bid yet';
  end if;

  update public.tasks
    set status = 'completed'
    where id = p_task_id and status = 'in_progress';

  if not found then
    raise exception 'Task must be in progress to mark it complete';
  end if;

  update public.profiles
    set completion_count = completion_count + 1
    where id = v_accepted_tasker_id;
end;
$$ language plpgsql security definer;

revoke execute on function public.finalize_task_completion(uuid, uuid) from public, anon, authenticated;

-- submit_review() from 003_complete_and_review.sql is unaffected — it already reads
-- task status/accepted bid itself and isn't involved in the money movement above.
