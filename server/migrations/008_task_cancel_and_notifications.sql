-- Sirius Jobs — task cancellation + basic in-app notifications
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 007b).

-- ============================================================
-- cancel_task(): poster can cancel their own task while it's still open (no accepted
-- bid yet, no money has moved). Once a bid is accepted the task must be handled
-- through the escrow/lead-fee completion or dispute paths instead — cancellation is
-- only for "nobody's working on this yet, I want to pull it down."
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

-- ============================================================
-- notifications: minimal in-app notification feed, populated by triggers on the
-- events that matter for noticing activity without manually refreshing — a new bid
-- on your task, your bid being accepted, and a new message. Read via polling from
-- the header badge (no realtime infra needed for a first pass).
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  task_id uuid references public.tasks (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications visible to their owner" on public.notifications;
create policy "notifications visible to their owner" on public.notifications
  for select using (user_id = auth.uid());

-- Marking your own notifications read is the only client write allowed; creation is
-- always via the trigger functions below (security definer), never direct insert.
drop policy if exists "users can mark own notifications read" on public.notifications;
create policy "users can mark own notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- New bid -> notify the task poster.
create or replace function public.notify_on_new_bid()
returns trigger as $$
declare
  v_poster_id uuid;
  v_task_title text;
begin
  select poster_id, title into v_poster_id, v_task_title
    from public.tasks where id = new.task_id;

  if v_poster_id is not null then
    insert into public.notifications (user_id, kind, task_id, body)
    values (v_poster_id, 'new_bid', new.task_id, 'New bid on "' || v_task_title || '"');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_bid_created_notify on public.bids;
create trigger on_bid_created_notify
  after insert on public.bids
  for each row execute function public.notify_on_new_bid();

-- Bid accepted -> notify the tasker whose bid it was.
create or replace function public.notify_on_bid_accepted()
returns trigger as $$
declare
  v_task_title text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select title into v_task_title from public.tasks where id = new.task_id;

    insert into public.notifications (user_id, kind, task_id, body)
    values (new.tasker_id, 'bid_accepted', new.task_id, 'Your bid was accepted on "' || v_task_title || '"');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_bid_updated_notify on public.bids;
create trigger on_bid_updated_notify
  after update on public.bids
  for each row execute function public.notify_on_bid_accepted();

-- New message -> notify the recipient.
create or replace function public.notify_on_new_message()
returns trigger as $$
begin
  insert into public.notifications (user_id, kind, task_id, body)
  values (new.recipient_id, 'new_message', new.task_id, 'New message');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_created_notify on public.messages;
create trigger on_message_created_notify
  after insert on public.messages
  for each row execute function public.notify_on_new_message();

-- mark_notifications_read(): bulk-mark everything read at once, called when the user
-- opens the notification dropdown, instead of one client-side update-per-row.
create or replace function public.mark_notifications_read()
returns void as $$
begin
  update public.notifications
    set read_at = now()
    where user_id = auth.uid() and read_at is null;
end;
$$ language plpgsql security definer;
