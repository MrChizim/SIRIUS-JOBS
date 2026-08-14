-- Sirius Jobs — let a user clear their own notification feed. Only select/update
-- policies existed before (mark-as-read); this adds delete so "Clear all" works.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 016).

drop policy if exists "users can delete own notifications" on public.notifications;
create policy "users can delete own notifications" on public.notifications
  for delete using (user_id = auth.uid());
