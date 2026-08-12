import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, User, CheckCircle2, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import ReviewForm from '../components/ReviewForm';
import TaskChat from '../components/TaskChat';
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
};

function TaskWithBids({ task, currentUserId }: { task: Task; currentUserId: string }) {
  const [status, setStatus] = useState(task.status);
  const [bids, setBids] = useState<BidRow[] | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptedBid = bids?.find((b) => b.status === 'accepted') ?? null;

  async function loadBids() {
    const { data } = await supabase
      .from('bids')
      .select(
        'id, tasker_id, amount, message, status, created_at, profiles(full_name, rating_avg, rating_count, completion_count)',
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
        } | null;
        return {
          ...b,
          tasker_name: profile?.full_name ?? null,
          tasker_rating_avg: profile?.rating_avg ?? 0,
          tasker_rating_count: profile?.rating_count ?? 0,
          tasker_completion_count: profile?.completion_count ?? 0,
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

  async function handleAccept(bidId: string) {
    setError(null);
    setAcceptingId(bidId);

    const { error: rpcError } = await supabase.rpc('accept_bid', { p_bid_id: bidId });

    setAcceptingId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStatus('in_progress');
    await loadBids();
  }

  async function handleMarkComplete() {
    setError(null);
    setCompleting(true);

    const { error: rpcError } = await supabase.rpc('mark_task_complete', { p_task_id: task.id });

    setCompleting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStatus('completed');
    setHasReviewed(false);
  }

  return (
    <div className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Link to={`/tasks/${task.id}`} className="font-bold text-gray-900 hover:text-primary">
            {task.title}
          </Link>
          <p className="mt-1 text-sm text-gray-500">{task.city}</p>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 capitalize">
          {status.replace('_', ' ')}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {status === 'in_progress' && acceptedBid && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-sm text-primary">
            {acceptedBid.tasker_name || 'Tasker'} is working on this task.
          </p>
          <button
            onClick={handleMarkComplete}
            disabled={completing}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {completing ? 'Confirming…' : 'Mark Complete'}
          </button>
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
              className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
                bid.status === 'accepted'
                  ? 'border-green-200 bg-green-50'
                  : bid.status === 'rejected'
                    ? 'border-gray-200 bg-gray-50 opacity-60'
                    : 'border-gray-200/70 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {bid.tasker_name || 'Tasker'} · ₦{bid.amount.toLocaleString('en-NG')}
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
                  {bid.message && <p className="mt-1 text-sm text-gray-600">{bid.message}</p>}
                </div>
              </div>

              {bid.status === 'accepted' ? (
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Accepted
                </span>
              ) : bid.status === 'pending' && status === 'open' ? (
                <button
                  onClick={() => handleAccept(bid.id)}
                  disabled={acceptingId === bid.id}
                  className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {acceptingId === bid.id ? 'Accepting…' : 'Accept'}
                </button>
              ) : (
                <span className="shrink-0 text-sm text-gray-400 capitalize">{bid.status}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('tasks')
      .select('*')
      .eq('poster_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setTasks(data ?? []));
  }, [user]);

  if (!user) return null;

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-600">Review bids, accept one, and confirm when done</p>
          </div>
        </div>

        {tasks === null ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-3xl border border-gray-200/70 bg-white p-10 text-center">
            <p className="text-gray-600">You haven't posted any tasks yet.</p>
            <Link
              to="/post-a-task"
              className="mt-4 inline-block font-semibold text-primary hover:underline"
            >
              Post your first task
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {tasks.map((task) => (
              <TaskWithBids key={task.id} task={task} currentUserId={user.id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
