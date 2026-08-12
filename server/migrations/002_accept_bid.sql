-- Sirius Jobs — accept-a-bid transaction
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 001_initial_schema.sql)

-- Accepting a bid must be one atomic operation: mark the bid accepted, reject every
-- other bid on the same task, and move the task to in_progress — all or nothing.
-- Wrapping this in a single Postgres function (called via RPC from the app) avoids the
-- app ever being able to leave the data in a half-updated state (e.g. two "accepted"
-- bids on the same task from a network hiccup between separate update calls).

create or replace function public.accept_bid(p_bid_id uuid)
returns void as $$
declare
  v_task_id uuid;
  v_poster_id uuid;
begin
  select b.task_id, t.poster_id
    into v_task_id, v_poster_id
    from public.bids b
    join public.tasks t on t.id = b.task_id
    where b.id = p_bid_id;

  if v_task_id is null then
    raise exception 'Bid not found';
  end if;

  if v_poster_id <> auth.uid() then
    raise exception 'Only the task poster can accept a bid';
  end if;

  update public.tasks
    set status = 'in_progress'
    where id = v_task_id and status = 'open';

  if not found then
    raise exception 'Task is not open for bidding';
  end if;

  update public.bids
    set status = 'accepted'
    where id = p_bid_id;

  update public.bids
    set status = 'rejected'
    where task_id = v_task_id and id <> p_bid_id and status = 'pending';
end;
$$ language plpgsql security definer;

-- RLS on tasks/bids still applies to everything else; this function is the one
-- controlled way to cross from "open, multiple pending bids" to "in_progress, one
-- accepted bid" atomically. security definer lets it update rows the caller couldn't
-- otherwise touch directly (rejecting other taskers' bids), but the auth.uid() check
-- inside means only the real poster can ever invoke it successfully.

-- The original "taskers can update own bids" policy (001_initial_schema.sql) let a
-- tasker set their own bid's status directly, including straight to 'accepted' —
-- bypassing accept_bid()'s poster-only check entirely. Replace it with a policy that
-- only allows a tasker to withdraw their own still-pending bid; every other status
-- transition must go through accept_bid().
drop policy if exists "taskers can update own bids" on public.bids;
create policy "taskers can withdraw own pending bids" on public.bids
  for update
  using (tasker_id = auth.uid() and status = 'pending')
  with check (tasker_id = auth.uid() and status = 'withdrawn');

