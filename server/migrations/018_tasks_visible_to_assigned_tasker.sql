-- Sirius Jobs — once a task moves past 'open', RLS made it invisible to the
-- tasker actually working it (only status = 'open' or the poster could read it).
-- This silently broke "Tasks I'm Bidding On", the earnings/stats dashboard, and
-- any other page reading a non-open task on behalf of its assigned tasker — the
-- row wasn't missing, it was just filtered out before the client ever saw it.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 017).

drop policy if exists "open tasks are publicly readable" on public.tasks;
create policy "tasks visible when open, owned, or assigned" on public.tasks
  for select using (
    status = 'open'
    or poster_id = auth.uid()
    or exists (
      select 1 from public.bids b
      where b.task_id = id and b.tasker_id = auth.uid() and b.status = 'accepted'
    )
    or exists (
      select 1 from public.leads l
      where l.task_id = id and l.professional_id = auth.uid()
    )
  );
