import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  CheckCircle2,
  Star,
  BadgeCheck,
  ChevronDown,
  Wallet,
  ListChecks,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { startBidAcceptance, completeEscrowTask } from '../lib/escrow';
import ReviewForm from '../components/ReviewForm';
import TaskChat from '../components/TaskChat';
import TaskMessageThreads from '../components/TaskMessageThreads';
import Avatar from '../components/Avatar';
import RaiseDisputeForm from '../components/RaiseDisputeForm';
import DisputeStatusBanner from '../components/DisputeStatusBanner';
import EditTaskForm from '../components/EditTaskForm';
import MyBids from './MyBids';
import type { Task } from '../lib/types';

type BidRow = {
  id: string;
  tasker_id: string;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
  tasker_name: string | null;
  tasker_rating_avg: number;
  tasker_rating_count: number;
  tasker_completion_count: number;
  tasker_verified_badge: boolean;
  tasker_avatar_url: string | null;
};

function statusStyle(status: string) {
  switch (status) {
    case 'open':
      return 'bg-blue-50 text-primary';
    case 'in_progress':
      return 'bg-amber-50 text-amber-700';
    case 'completed':
      return 'bg-green-50 text-green-700';
    case 'disputed':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function TaskWithBids({ task, currentUserId }: { task: Task; currentUserId: string }) {
  const [status, setStatus] = useState(task.status);
  const [taskDetails, setTaskDetails] = useState({
    title: task.title,
    description: task.description,
    budget_min: task.budget_min,
    budget_max: task.budget_max,
  });
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bids, setBids] = useState<BidRow[] | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [hasReviewed, setHasReviewed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptedBid = bids?.find((b) => b.status === 'accepted') ?? null;
  const pendingCount = bids?.filter((b) => b.status === 'pending').length ?? 0;

  async function loadBids() {
    const { data } = await supabase
      .from('bids')
      .select(
        'id, tasker_id, amount, message, status, created_at, profiles(full_name, rating_avg, rating_count, completion_count, verified_badge, avatar_url)',
      )
      .eq('task_id', task.id)
      .order('amount', { ascending: true });

    setBids(
      (data ?? []).map((b) => {
        const profile = b.profiles as unknown as {
          full_name: string | null;
          rating_avg: number;
          rating_count: number;
          completion_count: number;
          verified_badge: boolean;
          avatar_url: string | null;
        } | null;
        return {
          ...b,
          tasker_name: profile?.full_name ?? null,
          tasker_rating_avg: profile?.rating_avg ?? 0,
          tasker_rating_count: profile?.rating_count ?? 0,
          tasker_completion_count: profile?.completion_count ?? 0,
          tasker_verified_badge: profile?.verified_badge ?? false,
          tasker_avatar_url: profile?.avatar_url ?? null,
        };
      }),
    );
  }

  async function checkReviewed() {
    const { data } = await supabase
      .from('reviews')
      .select('id')
      .eq('task_id', task.id)
      .eq('reviewer_id', currentUserId)
      .maybeSingle();
    setHasReviewed(!!data);
  }

  useEffect(() => {
    loadBids();
    if (task.status === 'completed') checkReviewed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function handleAccept(bidId: string, amount: number) {
    if (
      !confirm(
        `Accept this bid for ₦${amount.toLocaleString('en-NG')}? You'll be taken to pay and hold the amount securely.`,
      )
    ) {
      return;
    }

    setError(null);
    setAcceptingId(bidId);

    try {
      const authorizationUrl = await startBidAcceptance(bidId);
      window.location.href = authorizationUrl;
      // No further state change here — the bid isn't actually accepted until payment
      // is confirmed and the Paystack webhook flips it, which happens after the
      // browser redirects away to complete checkout.
    } catch (err) {
      setAcceptingId(null);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function handleReject(bidId: string) {
    if (!confirm('Reject this bid? This cannot be undone.')) return;

    setError(null);
    setRejectingId(bidId);

    const { error: rpcError } = await supabase.rpc('reject_bid', { p_bid_id: bidId });

    setRejectingId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    await loadBids();
  }

  async function handleMarkComplete() {
    setError(null);
    setCompleting(true);

    try {
      await completeEscrowTask(task.id);
      setStatus('completed');
      setHasReviewed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this task? This cannot be undone.')) return;

    setError(null);
    setCancelling(true);

    const { error: rpcError } = await supabase.rpc('cancel_task', { p_task_id: task.id });

    setCancelling(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStatus('cancelled');
  }

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-4 text-left sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-gray-900">{taskDetails.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{task.city}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-bold capitalize ${statusStyle(status)}`}
            >
              {status.replace('_', ' ')}
            </span>
            {status === 'open' && pendingCount > 0 && (
              <span className="font-semibold text-primary">
                {pendingCount} bid{pendingCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {status === 'open' && bids?.length === 0 && (
              <button
                onClick={() => setEditing((e) => !e)}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:border-primary hover:text-primary"
              >
                {editing ? 'Close Edit' : 'Edit Task'}
              </button>
            )}
            {status === 'open' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Cancel Task'}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {editing && (
            <div className="mb-4">
              <EditTaskForm
                task={{ ...task, ...taskDetails }}
                onSaved={(updates) => {
                  setTaskDetails(updates);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            </div>
          )}

          {status === 'in_progress' && acceptedBid && (
            <div className="mb-4 space-y-3">
              <div className="flex flex-col gap-3 rounded-2xl bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-sm text-primary">
                  <Link
                    to={`/users/${acceptedBid.tasker_id}`}
                    className="font-semibold underline hover:no-underline"
                  >
                    {acceptedBid.tasker_name || 'Tasker'}
                  </Link>{' '}
                  is working on this task.
                </p>
                <button
                  onClick={handleMarkComplete}
                  disabled={completing}
                  className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {completing ? 'Confirming…' : 'Mark Complete'}
                </button>
              </div>
              {disputing ? (
                <RaiseDisputeForm
                  taskId={task.id}
                  onRaised={() => setStatus('disputed')}
                  onCancel={() => setDisputing(false)}
                />
              ) : (
                <button
                  onClick={() => setDisputing(true)}
                  className="text-xs font-semibold text-gray-400 hover:text-red-600"
                >
                  Something wrong with this job? Raise a dispute
                </button>
              )}
            </div>
          )}

          {status === 'disputed' && (
            <div className="mb-4">
              <DisputeStatusBanner taskId={task.id} />
            </div>
          )}

          {status === 'completed' && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Task completed
              </p>
              {hasReviewed === false && (
                <ReviewForm taskId={task.id} onSubmitted={() => setHasReviewed(true)} />
              )}
              {hasReviewed === true && (
                <p className="flex items-center gap-1.5 text-sm text-green-700">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  You've reviewed this task.
                </p>
              )}
            </div>
          )}

          {(status === 'in_progress' || status === 'completed') && acceptedBid && (
            <div className="mb-4">
              <TaskChat
                taskId={task.id}
                currentUserId={currentUserId}
                otherUserId={acceptedBid.tasker_id}
                otherUserLabel={acceptedBid.tasker_name || 'the tasker'}
              />
            </div>
          )}

          {bids === null ? (
            <div className="py-4 text-sm text-gray-400">Loading bids…</div>
          ) : bids.length === 0 ? (
            <div className="py-4 text-sm text-gray-400">No bids yet.</div>
          ) : (
            <div className="space-y-3">
              {bids.map((bid) => (
                <div
                  key={bid.id}
                  className={`rounded-2xl border p-4 ${
                    bid.status === 'accepted'
                      ? 'border-green-200 bg-green-50'
                      : bid.status === 'rejected'
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-gray-200/70 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar url={bid.tasker_avatar_url} name={bid.tasker_name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
                        <Link
                          to={`/users/${bid.tasker_id}`}
                          className="truncate hover:text-primary hover:underline"
                        >
                          {bid.tasker_name || 'Tasker'}
                        </Link>
                        {bid.tasker_verified_badge && (
                          <BadgeCheck
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-label="Verified"
                          />
                        )}
                        <span className="shrink-0">· ₦{bid.amount.toLocaleString('en-NG')}</span>
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        {bid.tasker_rating_count > 0 ? (
                          <>
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {bid.tasker_rating_avg.toFixed(1)} ({bid.tasker_rating_count})
                            <span className="mx-1">·</span>
                            {bid.tasker_completion_count} completed
                          </>
                        ) : (
                          'No reviews yet'
                        )}
                      </p>
                      {bid.message && (
                        <p className="mt-1 text-sm text-gray-600">{bid.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    {bid.status === 'accepted' ? (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Accepted
                      </span>
                    ) : bid.status === 'pending' && status === 'open' ? (
                      <>
                        <button
                          onClick={() => handleReject(bid.id)}
                          disabled={rejectingId === bid.id || acceptingId === bid.id}
                          className="rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {rejectingId === bid.id ? 'Rejecting…' : 'Reject'}
                        </button>
                        <button
                          onClick={() => handleAccept(bid.id, bid.amount)}
                          disabled={acceptingId === bid.id || rejectingId === bid.id}
                          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {acceptingId === bid.id ? 'Accepting…' : 'Accept'}
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400 capitalize">{bid.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === 'open' && (
            <div className="mt-4">
              <TaskMessageThreads taskId={task.id} currentUserId={currentUserId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type PosterStats = {
  totalSpent: number;
  tasksPosted: number;
  tasksCompleted: number;
};

function PosterStatsSummary({ userId }: { userId: string }) {
  const [stats, setStats] = useState<PosterStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('tasks')
      .select('status, escrow_transactions(status, amount)')
      .eq('poster_id', userId)
      .then(({ data }) => {
        if (cancelled || !data) return;

        let totalSpent = 0;
        let tasksCompleted = 0;

        for (const row of data as unknown as {
          status: string;
          escrow_transactions: { status: string; amount: number }[];
        }[]) {
          if (row.status === 'completed') tasksCompleted += 1;
          const released = row.escrow_transactions?.find((t) => t.status === 'released');
          if (released) totalSpent += Number(released.amount);
        }

        setStats({ totalSpent, tasksPosted: data.length, tasksCompleted });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!stats) return null;

  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
          <Wallet className="h-4 w-4" />
        </div>
        <p className="text-xl font-black text-gray-900">₦{stats.totalSpent.toLocaleString('en-NG')}</p>
        <p className="text-xs text-gray-500">Total spent</p>
      </div>
      <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-4 w-4" />
        </div>
        <p className="text-xl font-black text-gray-900">{stats.tasksPosted}</p>
        <p className="text-xs text-gray-500">Tasks posted</p>
      </div>
      <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <p className="text-xl font-black text-gray-900">{stats.tasksCompleted}</p>
        <p className="text-xs text-gray-500">Completed</p>
      </div>
    </div>
  );
}

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [tab, setTab] = useState<'posted' | 'bidding'>('posted');
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentJustCompleted = searchParams.get('escrow_payment') === 'complete';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('tasks')
      .select('*')
      .eq('poster_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setTasks(data ?? []));
  }, [user, paymentJustCompleted]);

  useEffect(() => {
    if (!paymentJustCompleted) return;
    const next = new URLSearchParams(searchParams);
    next.delete('escrow_payment');
    setSearchParams(next, { replace: true });
  }, [paymentJustCompleted]);

  if (!user) return null;

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {paymentJustCompleted && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Payment successful. The tasker has been notified and can start work.
          </div>
        )}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-600">Review bids, accept one, and confirm when done</p>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab('posted')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'posted' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tasks I Posted
          </button>
          <button
            onClick={() => setTab('bidding')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'bidding' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tasks I'm Bidding On
          </button>
        </div>

        {tab === 'bidding' ? (
          <MyBids userId={user.id} />
        ) : tasks === null ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <>
            <PosterStatsSummary userId={user.id} />
            <div className="rounded-3xl border border-gray-200/70 bg-white p-10 text-center">
              <p className="text-gray-600">You haven't posted any tasks yet.</p>
              <Link
                to="/post-a-task"
                className="mt-4 inline-block font-semibold text-primary hover:underline"
              >
                Post your first task
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <PosterStatsSummary userId={user.id} />
            {tasks.map((task) => (
              <TaskWithBids key={task.id} task={task} currentUserId={user.id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
