-- Sirius Jobs — let chat messages carry a photo, not just text.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 019).
--
-- Motivating case: a tasker sent to buy something (e.g. "buy potatoes") needs to show
-- the poster the item/price before the poster pays the vendor directly, off-platform
-- (Sirius Jobs doesn't hold or move purchase money — only the labor/lead payment goes
-- through escrow). A photo attached to the existing task chat is enough evidence for
-- the poster to decide; no separate purchase/approval flow or payment record needed.

alter table public.messages add column if not exists image_url text;

-- body was NOT NULL because every message used to be text-only. A photo-only message
-- (no caption) is a normal case now, so body becomes optional — but a message must
-- still carry *something*.
alter table public.messages alter column body drop not null;

alter table public.messages drop constraint if exists messages_body_or_image_check;
alter table public.messages add constraint messages_body_or_image_check
  check (body is not null or image_url is not null);

-- Private bucket: unlike avatars, a purchase photo is only relevant to the poster and
-- tasker on that task, not the public. Same folder-scoped ownership convention as
-- avatars/id-documents, just not marked public.
insert into storage.buckets (id, name, public)
values ('message-photos', 'message-photos', false)
on conflict (id) do nothing;

-- Path convention: {task_id}/{sender_id}/{filename}. Visible to whoever uploaded it,
-- or whoever the matching message's recipient is (mirrors "messages visible to sender
-- and recipient" in 004_messages.sql) — checked by joining to the message row that
-- references this path, since chat is always exactly poster <-> one other party.
drop policy if exists "task participants can view message photos" on storage.objects;
create policy "task participants can view message photos" on storage.objects
  for select using (
    bucket_id = 'message-photos'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or exists (
        select 1 from public.messages m
        where m.image_url = name and m.recipient_id = auth.uid()
      )
    )
  );

drop policy if exists "users can upload message photos to their own folder" on storage.objects;
create policy "users can upload message photos to their own folder" on storage.objects
  for insert
  with check (
    bucket_id = 'message-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
