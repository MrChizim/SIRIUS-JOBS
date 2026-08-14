-- Sirius Jobs — notify a tasker when their bid is rejected, whether explicitly (via
-- reject_bid()) or implicitly (as a side effect of a different bid being accepted on
-- the same task via finalize_bid_acceptance()). Previously only acceptance notified
-- the tasker — rejection left them with no signal at all.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 013).

create or replace function public.notify_on_bid_status_change()
returns trigger as $$
declare
  v_task_title text;
begin
  select title into v_task_title from public.tasks where id = new.task_id;

  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notifications (user_id, kind, task_id, body)
    values (new.tasker_id, 'bid_accepted', new.task_id, 'Your bid was accepted on "' || v_task_title || '"');
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    insert into public.notifications (user_id, kind, task_id, body)
    values (new.tasker_id, 'bid_rejected', new.task_id, 'Your bid was not selected for "' || v_task_title || '"');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_bid_updated_notify on public.bids;
create trigger on_bid_updated_notify
  after update on public.bids
  for each row execute function public.notify_on_bid_status_change();
