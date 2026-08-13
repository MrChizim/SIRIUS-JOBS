-- Sirius Jobs — dispute resolution: raise + resolve, escrow-path only.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run (after 010).

-- ============================================================
-- The bare "users can raise disputes" INSERT policy from 001_initial_schema.sql let
-- any authenticated user insert a disputes row with raised_by = themselves, with no
-- validation that they're a participant, no check on task.path/status, and no
-- corresponding state change on tasks/escrow_transactions. Replace it entirely with
-- an RPC-only flow, same reasoning as finalize_bid_acceptance/finalize_task_completion.
-- ============================================================
drop policy if exists "users can raise disputes" on public.disputes;

-- ============================================================
-- raise_dispute(): atomic — inserts the dispute row and freezes the task/escrow so
-- mark-complete (server/api/escrow/complete.ts) can no longer fire a payout while a
-- dispute is open. Callable directly by authenticated clients (unlike the admin RPCs
-- below) since either participant must be able to self-serve raise one; auth.uid()
-- is trusted here rather than a passed-in user id.
--
-- Disputes can only be raised while the task is 'in_progress' — once a poster marks
-- a task complete, that's treated as final (the payout transfer is already initiated
-- synchronously in server/api/escrow/complete.ts by the time task.status flips to
-- 'completed'), so no post-completion dispute window is supported.
-- ============================================================
create or replace function public.raise_dispute(
  p_task_id uuid,
  p_reason text
)
returns uuid as $$
declare
  v_task record;
  v_accepted_tasker_id uuid;
  v_dispute_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) < 10 then
    raise exception 'Please describe the issue in at least 10 characters.';
  end if;

  select id, poster_id, path, status into v_task
    from public.tasks where id = p_task_id;

  if v_task.id is null then
    raise exception 'Task not found';
  end if;
  if v_task.path <> 'escrow' then
    raise exception 'Disputes are only supported for bid & escrow tasks';
  end if;
  if v_task.status <> 'in_progress' then
    raise exception 'A dispute can only be raised while the task is in progress';
  end if;

  select tasker_id into v_accepted_tasker_id
    from public.bids
    where task_id = p_task_id and status = 'accepted'
    limit 1;

  if v_accepted_tasker_id is null then
    raise exception 'This task has no accepted bid';
  end if;

  if auth.uid() <> v_task.poster_id and auth.uid() <> v_accepted_tasker_id then
    raise exception 'Only the task poster or the assigned tasker can raise a dispute';
  end if;

  if exists (
    select 1 from public.disputes
    where task_id = p_task_id and status = 'open'
  ) then
    raise exception 'A dispute is already open for this task';
  end if;

  update public.tasks set status = 'disputed' where id = p_task_id;

  update public.escrow_transactions
    set status = 'disputed'
    where task_id = p_task_id and status = 'held';

  if not found then
    raise exception 'No held escrow payment found for this task';
  end if;

  insert into public.disputes (task_id, raised_by, reason)
    values (p_task_id, auth.uid(), p_reason)
    returning id into v_dispute_id;

  return v_dispute_id;
end;
$$ language plpgsql security definer;

-- Grant to authenticated (not revoked) — unlike the admin-only RPCs, both
-- participants must be able to call this directly from the browser. auth.uid() inside
-- a security definer function still reflects the calling user's JWT when invoked via
-- supabase-js with the user's session (not service_role), so the authorization checks
-- above are not bypassable by a random authenticated user.
grant execute on function public.raise_dispute(uuid, text) to authenticated;

-- ============================================================
-- disputes: participants need to see the accepted tasker's own disputes too, not
-- just the poster's — the 001 policy only covered raised_by = self OR poster. A
-- tasker who did NOT raise the dispute (poster raised it against them) still needs
-- to see it.
-- ============================================================
drop policy if exists "disputes visible to participants" on public.disputes;
create policy "disputes visible to participants" on public.disputes
  for select using (
    raised_by = auth.uid()
    or exists (select 1 from public.tasks t where t.id = task_id and t.poster_id = auth.uid())
    or exists (
      select 1 from public.bids b
      where b.task_id = task_id and b.status = 'accepted' and b.tasker_id = auth.uid()
    )
  );

-- ============================================================
-- resolve_dispute_release(): admin decides the tasker did the work — proceed exactly
-- as finalize_task_completion does (task -> completed, completion_count++), but the
-- Paystack transfer itself is initiated by the caller (server/api/admin/disputes/
-- decide.ts) BEFORE this RPC runs, mirroring server/api/escrow/complete.ts's own
-- sequencing (transfer first, then flip DB state) so a Paystack failure never leaves
-- the DB claiming a payout that didn't happen.
-- ============================================================
create or replace function public.resolve_dispute_release(
  p_dispute_id uuid,
  p_resolution_notes text,
  p_transfer_code text
)
returns void as $$
declare
  v_task_id uuid;
  v_dispute_status dispute_status;
  v_accepted_tasker_id uuid;
begin
  select task_id, status into v_task_id, v_dispute_status
    from public.disputes where id = p_dispute_id;

  if v_task_id is null then
    raise exception 'Dispute not found';
  end if;
  if v_dispute_status <> 'open' then
    raise exception 'Dispute is not open (status: %)', v_dispute_status;
  end if;

  select tasker_id into v_accepted_tasker_id
    from public.bids where task_id = v_task_id and status = 'accepted' limit 1;

  update public.escrow_transactions
    set status = 'payout_pending', paystack_transfer_code = p_transfer_code
    where task_id = v_task_id and status = 'disputed';

  if not found then
    raise exception 'No disputed escrow payment found for this task';
  end if;

  update public.tasks set status = 'completed' where id = v_task_id;

  update public.profiles
    set completion_count = completion_count + 1
    where id = v_accepted_tasker_id;

  update public.disputes
    set status = 'resolved', resolution_notes = p_resolution_notes, resolved_at = now()
    where id = p_dispute_id;
end;
$$ language plpgsql security definer;

revoke execute on function public.resolve_dispute_release(uuid, text, text) from public, anon, authenticated;

-- ============================================================
-- resolve_dispute_refund(): admin decides the poster should get their money back.
-- Same sequencing rule — the Paystack refund call happens in decide.ts BEFORE this
-- RPC runs, so the RPC only ever records a refund that Paystack already confirmed.
-- No v1 support for partial refunds/splits — full release or full refund only.
-- ============================================================
create or replace function public.resolve_dispute_refund(
  p_dispute_id uuid,
  p_resolution_notes text
)
returns void as $$
declare
  v_task_id uuid;
  v_dispute_status dispute_status;
begin
  select task_id, status into v_task_id, v_dispute_status
    from public.disputes where id = p_dispute_id;

  if v_task_id is null then
    raise exception 'Dispute not found';
  end if;
  if v_dispute_status <> 'open' then
    raise exception 'Dispute is not open (status: %)', v_dispute_status;
  end if;

  update public.escrow_transactions
    set status = 'refunded'
    where task_id = v_task_id and status = 'disputed';

  if not found then
    raise exception 'No disputed escrow payment found for this task';
  end if;

  update public.tasks set status = 'cancelled' where id = v_task_id;

  update public.disputes
    set status = 'resolved', resolution_notes = p_resolution_notes, resolved_at = now()
    where id = p_dispute_id;
end;
$$ language plpgsql security definer;

revoke execute on function public.resolve_dispute_refund(uuid, text) from public, anon, authenticated;

-- ============================================================
-- Notifications: dispute raised -> notify the other participant; dispute resolved
-- -> notify both. Follows the same trigger pattern as 008_task_cancel_and_notifications.sql.
-- ============================================================
create or replace function public.notify_on_dispute_raised()
returns trigger as $$
declare
  v_poster_id uuid;
  v_tasker_id uuid;
  v_task_title text;
  v_recipient uuid;
begin
  select t.poster_id, t.title into v_poster_id, v_task_title
    from public.tasks t where t.id = new.task_id;

  select b.tasker_id into v_tasker_id
    from public.bids b where b.task_id = new.task_id and b.status = 'accepted' limit 1;

  v_recipient := case when new.raised_by = v_poster_id then v_tasker_id else v_poster_id end;

  if v_recipient is not null then
    insert into public.notifications (user_id, kind, task_id, body)
    values (v_recipient, 'dispute_raised', new.task_id, 'A dispute was raised on "' || v_task_title || '"');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_dispute_created_notify on public.disputes;
create trigger on_dispute_created_notify
  after insert on public.disputes
  for each row execute function public.notify_on_dispute_raised();

create or replace function public.notify_on_dispute_resolved()
returns trigger as $$
declare
  v_poster_id uuid;
  v_tasker_id uuid;
  v_task_title text;
begin
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    select t.poster_id, t.title into v_poster_id, v_task_title
      from public.tasks t where t.id = new.task_id;

    select b.tasker_id into v_tasker_id
      from public.bids b where b.task_id = new.task_id and b.status = 'accepted' limit 1;

    if v_poster_id is not null then
      insert into public.notifications (user_id, kind, task_id, body)
      values (v_poster_id, 'dispute_resolved', new.task_id, 'The dispute on "' || v_task_title || '" has been resolved');
    end if;

    if v_tasker_id is not null then
      insert into public.notifications (user_id, kind, task_id, body)
      values (v_tasker_id, 'dispute_resolved', new.task_id, 'The dispute on "' || v_task_title || '" has been resolved');
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_dispute_updated_notify on public.disputes;
create trigger on_dispute_updated_notify
  after update on public.disputes
  for each row execute function public.notify_on_dispute_resolved();

