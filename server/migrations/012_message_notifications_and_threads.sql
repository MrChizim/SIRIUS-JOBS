-- Sirius Jobs — fix invisible pre-bid messages: posters had no way to see a message
-- from anyone who hadn't bid on their task yet, since MyTasks.tsx only rendered chat
-- per-bid. This adds what's needed to build a real thread list independent of bids:
-- who sent the notification (so the UI can open the right conversation) and a
-- friendlier notification body.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 011).

alter table public.notifications add column if not exists sender_id uuid references public.profiles (id);

create or replace function public.notify_on_new_message()
returns trigger as $$
declare
  v_sender_name text;
begin
  select full_name into v_sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, kind, task_id, sender_id, body)
  values (
    new.recipient_id,
    'new_message',
    new.task_id,
    new.sender_id,
    'New message from ' || coalesce(v_sender_name, 'someone')
  );

  return new;
end;
$$ language plpgsql security definer;
