-- Sirius Jobs — taskers had no way to know a payout actually landed: escrow release
-- happens via a Paystack webhook in the background, with no in-app signal. This
-- notifies the tasker (via the same notifications feed used for bids/messages) the
-- moment their payout's escrow_transactions row flips to 'released'.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 015).

create or replace function public.notify_on_payout_released()
returns trigger as $$
declare
  v_tasker_id uuid;
  v_task_id uuid;
  v_task_title text;
begin
  if new.status = 'released' and old.status is distinct from 'released' then
    select b.tasker_id, t.id, t.title
      into v_tasker_id, v_task_id, v_task_title
      from public.bids b
      join public.tasks t on t.id = b.task_id
      where b.id = new.bid_id;

    if v_tasker_id is not null then
      insert into public.notifications (user_id, kind, task_id, body)
      values (
        v_tasker_id,
        'payout_released',
        v_task_id,
        'You''ve been paid ₦' || to_char(new.payout_amount, 'FM999,999,999') || ' for "' || v_task_title || '"'
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_escrow_released_notify on public.escrow_transactions;
create trigger on_escrow_released_notify
  after update on public.escrow_transactions
  for each row execute function public.notify_on_payout_released();
