-- Sirius Jobs — let a poster explicitly reject a single pending bid, independent of
-- accepting a different one. Previously the only way a bid became 'rejected' was as
-- a side effect of finalize_bid_acceptance() accepting someone else's bid on the same
-- task — there was no way to reject a bid you simply don't want, while leaving the
-- task open for other bids to still come in or be accepted later.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 012).

create or replace function public.reject_bid(p_bid_id uuid)
returns void as $$
declare
  v_task_id uuid;
  v_poster_id uuid;
begin
  select b.task_id, t.poster_id into v_task_id, v_poster_id
    from public.bids b
    join public.tasks t on t.id = b.task_id
    where b.id = p_bid_id;

  if v_task_id is null then
    raise exception 'Bid not found';
  end if;

  if v_poster_id <> auth.uid() then
    raise exception 'Only the task poster can reject this bid';
  end if;

  update public.bids
    set status = 'rejected'
    where id = p_bid_id and status = 'pending';

  if not found then
    raise exception 'Only a pending bid can be rejected';
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.reject_bid(uuid) to authenticated;
