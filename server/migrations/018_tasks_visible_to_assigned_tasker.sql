-- Sirius Jobs — once a task moves past 'open', RLS made it invisible to the
-- tasker actually working it (only status = 'open' or the poster could read it).
-- This silently broke "Tasks I'm Bidding On", the earnings/stats dashboard, and
-- any other page reading a non-open task on behalf of its assigned tasker — the
-- row wasn't missing, it was just filtered out before the client ever saw it.
--
-- IMPORTANT: this replaces a broken first version of this migration. That version
-- added `EXISTS (SELECT ... FROM bids ...)` to the tasks policy, but the bids
-- policy already does `EXISTS (SELECT ... FROM tasks ...)` for the poster check —
-- two RLS policies each querying through the other creates a circular
-- dependency that broke Browse Tasks (a plain, unrelated tasks query) entirely.
-- This version uses security-definer helper functions to check bids/leads
-- without re-entering tasks RLS, avoiding the cycle.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 017,
-- replacing the first attempt at 018 if you ran it).

create or replace function public.is_accepted_tasker_for_task(p_task_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.bids b
    where b.task_id = p_task_id and b.tasker_id = p_user_id and b.status = 'accepted'
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_lead_buyer_for_task(p_task_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.leads l
    where l.task_id = p_task_id and l.professional_id = p_user_id
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "open tasks are publicly readable" on public.tasks;
drop policy if exists "tasks visible when open, owned, or assigned" on public.tasks;
create policy "tasks visible when open, owned, or assigned" on public.tasks
  for select using (
    status = 'open'
    or poster_id = auth.uid()
    or public.is_accepted_tasker_for_task(id, auth.uid())
    or public.is_lead_buyer_for_task(id, auth.uid())
  );
