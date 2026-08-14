-- Sirius Jobs — let a tasker resubmit a bid after the poster rejected it.
-- The bids table has a unique (task_id, tasker_id) constraint, so a fresh insert()
-- after rejection always fails with a duplicate-key error, permanently locking that
-- tasker out of a task they were once rejected on. This RPC updates the existing
-- rejected row back to 'pending' with the new amount/message instead of inserting.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 014).

create or replace function public.resubmit_bid(p_task_id uuid, p_amount numeric, p_message text)
returns void as $$
begin
  update public.bids
    set amount = p_amount,
        message = p_message,
        status = 'pending',
        created_at = now()
    where task_id = p_task_id
      and tasker_id = auth.uid()
      and status = 'rejected';

  if not found then
    raise exception 'No rejected bid found to resubmit';
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.resubmit_bid(uuid, numeric, text) to authenticated;
