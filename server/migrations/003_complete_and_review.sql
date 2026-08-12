-- Sirius Jobs — mark-complete + review submission
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 002_accept_bid.sql)

-- ============================================================
-- mark_task_complete: poster confirms the accepted bid's work is done.
-- Moves task to 'completed'. Escrow release itself happens separately once real
-- Paystack wiring exists (out of scope here) — this just marks the milestone so
-- reviews can unlock and completion_count can increment for the tasker.
-- ============================================================

create or replace function public.mark_task_complete(p_task_id uuid)
returns void as $$
declare
  v_poster_id uuid;
  v_accepted_tasker_id uuid;
begin
  select poster_id into v_poster_id from public.tasks where id = p_task_id;

  if v_poster_id is null then
    raise exception 'Task not found';
  end if;

  if v_poster_id <> auth.uid() then
    raise exception 'Only the task poster can mark it complete';
  end if;

  select tasker_id into v_accepted_tasker_id
    from public.bids
    where task_id = p_task_id and status = 'accepted'
    limit 1;

  if v_accepted_tasker_id is null then
    raise exception 'This task has no accepted bid yet';
  end if;

  update public.tasks
    set status = 'completed'
    where id = p_task_id and status = 'in_progress';

  if not found then
    raise exception 'Task must be in progress to mark it complete';
  end if;

  update public.profiles
    set completion_count = completion_count + 1
    where id = v_accepted_tasker_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- submit_review: either party (poster or the accepted tasker) reviews the other,
-- only after the task is completed. Recalculates the reviewee's rating_avg/rating_count
-- atomically in the same transaction as the insert.
-- ============================================================

create or replace function public.submit_review(
  p_task_id uuid,
  p_rating smallint,
  p_comment text
)
returns void as $$
declare
  v_poster_id uuid;
  v_task_status task_status;
  v_accepted_tasker_id uuid;
  v_reviewee_id uuid;
begin
  select poster_id, status into v_poster_id, v_task_status
    from public.tasks where id = p_task_id;

  if v_poster_id is null then
    raise exception 'Task not found';
  end if;

  if v_task_status <> 'completed' then
    raise exception 'This task is not completed yet';
  end if;

  select tasker_id into v_accepted_tasker_id
    from public.bids
    where task_id = p_task_id and status = 'accepted'
    limit 1;

  if auth.uid() = v_poster_id then
    v_reviewee_id := v_accepted_tasker_id;
  elsif auth.uid() = v_accepted_tasker_id then
    v_reviewee_id := v_poster_id;
  else
    raise exception 'Only the poster or the accepted tasker can review this task';
  end if;

  insert into public.reviews (task_id, reviewer_id, reviewee_id, rating, comment)
  values (p_task_id, auth.uid(), v_reviewee_id, p_rating, p_comment);

  update public.profiles
    set
      rating_count = rating_count + 1,
      rating_avg = (
        select round(avg(rating)::numeric, 2)
        from public.reviews
        where reviewee_id = v_reviewee_id
      )
    where id = v_reviewee_id;
end;
$$ language plpgsql security definer;

-- The existing "reviewer can insert own review" policy (001_initial_schema.sql) let
-- clients insert into reviews directly, which would bypass the completed-task check
-- and the rating_avg recalculation above. Remove direct insert access — all review
-- creation must go through submit_review().
drop policy if exists "reviewer can insert own review" on public.reviews;
