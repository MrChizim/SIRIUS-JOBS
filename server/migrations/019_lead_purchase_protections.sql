-- Sirius Jobs — protect posters' and taskers' interests once a lead is purchased.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 018).
--
-- Two gaps existed for lead-fee tasks (unlike escrow tasks, which use bids for this):
-- 1. Posters had no signal at all that a tasker had paid for a lead — no notification,
--    no list anywhere. The only way to find out was if the tasker messaged first.
-- 2. Nothing stopped a poster from editing or cancelling a task after a tasker had
--    already paid the lead fee — the RLS update policy and cancel_task() only ever
--    looked at bids, which lead-fee tasks never populate.
-- This migration adds the missing notification trigger and closes both gaps at the
-- RLS/RPC level (not just hiding a button client-side).

-- ============================================================
-- Lead purchased -> notify the task poster (mirrors notify_on_new_bid).
-- ============================================================
create or replace function public.notify_on_lead_purchased()
returns trigger as $$
declare
  v_poster_id uuid;
  v_task_title text;
begin
  if new.status = 'purchased' and old.status is distinct from 'purchased' then
    select poster_id, title into v_poster_id, v_task_title
      from public.tasks where id = new.task_id;

    if v_poster_id is not null then
      insert into public.notifications (user_id, kind, task_id, body)
      values (v_poster_id, 'lead_purchased', new.task_id, 'A tasker paid for a lead on "' || v_task_title || '"');
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_lead_updated_notify on public.leads;
create trigger on_lead_updated_notify
  after update on public.leads
  for each row execute function public.notify_on_lead_purchased();

-- Also cover leads inserted directly as 'purchased' (defensive — the server currently
-- always inserts as 'pending_payment' then updates to 'purchased' via the webhook, but
-- this keeps the notification correct even if that insert path changes later).
drop trigger if exists on_lead_created_notify on public.leads;
create trigger on_lead_created_notify
  after insert on public.leads
  for each row
  when (new.status = 'purchased')
  execute function public.notify_on_lead_purchased();

-- ============================================================
-- has_purchased_lead_for_task(): security-definer helper so the tasks RLS policy and
-- cancel_task() can check leads without re-entering tasks RLS (same pattern as
-- is_lead_buyer_for_task in 018, just answering "any lead purchased" rather than
-- "did this specific user buy one").
-- ============================================================
create or replace function public.has_purchased_lead_for_task(p_task_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.leads l
    where l.task_id = p_task_id and l.status = 'purchased'
  );
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- Tighten "posters can update own tasks": once a tasker has paid for a lead, the
-- poster can no longer change the task out from under them. Posting is still fine
-- while it's just open with no purchased leads.
-- ============================================================
drop policy if exists "posters can update own tasks" on public.tasks;
create policy "posters can update own tasks" on public.tasks
  for update using (
    poster_id = auth.uid()
    and not public.has_purchased_lead_for_task(id)
  );

-- ============================================================
-- cancel_task(): also block cancellation once a lead's been purchased, same spirit as
-- the existing "no accepted bid" rule for escrow tasks.
-- ============================================================
create or replace function public.cancel_task(p_task_id uuid)
returns void as $$
declare
  v_poster_id uuid;
begin
  select poster_id into v_poster_id from public.tasks where id = p_task_id;

  if v_poster_id is null then
    raise exception 'Task not found';
  end if;

  if v_poster_id <> auth.uid() then
    raise exception 'Only the task poster can cancel this task';
  end if;

  if public.has_purchased_lead_for_task(p_task_id) then
    raise exception 'This task cannot be cancelled — a tasker has already paid for a lead on it';
  end if;

  update public.tasks
    set status = 'cancelled'
    where id = p_task_id and status = 'open';

  if not found then
    raise exception 'Only an open task with no accepted bid can be cancelled';
  end if;

  update public.bids
    set status = 'rejected'
    where task_id = p_task_id and status = 'pending';
end;
$$ language plpgsql security definer;
