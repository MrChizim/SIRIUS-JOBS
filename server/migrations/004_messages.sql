-- Sirius Jobs — in-app messaging
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 003_complete_and_review.sql)

-- Design: messages are grouped by (task_id, other_party_id) so a poster can have a
-- separate thread with each prospective tasker who asks a question before bidding
-- (pre-bid), and that same thread continues after one tasker's bid is accepted
-- (post-acceptance coordination). This is the concrete mechanism behind "in-app chat
-- only, no phone numbers shown pre-acceptance" — see project memory / earlier
-- conversation on anti-workaround design.
--
-- Who's allowed to message whom on a task, enforced at the RLS level:
--   - The task's poster can message anyone.
--   - A non-poster can only message the task's poster (not other taskers).
-- This keeps threads strictly two-party (poster <-> one tasker at a time) without
-- needing a separate "conversations" table.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists messages_thread_idx
  on public.messages (task_id, least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

alter table public.messages enable row level security;

-- A message is visible to whoever sent or received it.
drop policy if exists "messages visible to sender and recipient" on public.messages;
create policy "messages visible to sender and recipient" on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Sending: you must be the sender, task must exist, and the pairing must be
-- poster<->someone (never two non-posters messaging each other about a task).
drop policy if exists "users can send messages as themselves" on public.messages;
create policy "users can send messages as themselves" on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.poster_id = auth.uid() or t.poster_id = recipient_id)
    )
  );
