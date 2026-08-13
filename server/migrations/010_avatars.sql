-- Sirius Jobs — profile pictures
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 009).

alter table public.profiles add column if not exists avatar_url text;

-- Public bucket (unlike id-documents): an avatar is meant to be freely viewable by
-- anyone browsing tasks/bids/profiles, same visibility level as full_name/rating.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Path convention: {user_id}/{filename} — same folder-scoped ownership pattern as
-- id-documents, but readable by anyone since the bucket itself is public.
drop policy if exists "anyone can view avatars" on storage.objects;
create policy "anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "users can upload own avatar" on storage.objects;
create policy "users can upload own avatar" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can replace own avatar" on storage.objects;
create policy "users can replace own avatar" on storage.objects
  for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete own avatar" on storage.objects;
create policy "users can delete own avatar" on storage.objects
  for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
