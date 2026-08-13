import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Wallet, ArrowLeft, Gavel, CheckCircle2, Star, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { startLeadPayment } from '../lib/leads';
import ReviewForm from '../components/ReviewForm';
import TaskChat from '../components/TaskChat';
import type { Category, Task } from '../lib/types';

type BidRow = {
  id: string;
  tasker_id: string;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
};

type LeadRow = {
  id: string;
  status: string;
};

function formatBudget(min: number | null, max: number | null) {
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Budget not specified';
}

export default function TaskDetail() {
  const { taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [myBid, setMyBid] = useState<BidRow | null>(null);
  const [myLead, setMyLead] = useState<LeadRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [hasReviewed, setHasReviewed] = useState<boolean | null>(null);

  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadStarting, setLeadStarting] = useState(false);

  const isOwner = task?.poster_id === user?.id;
  const isAcceptedTasker = myBid?.status === 'accepted';
  const hasPurchasedLead = myLead?.status === 'purchased';
  const showTaskerChat =
    !isOwner &&
    user &&
    task &&
    (task.path === 'escrow'
      ? task.status === 'open' || isAcceptedTasker
      : hasPurchasedLead);

  useEffect(() => {
    if (!taskId) return;

    setLoading(true);

    supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setTask(data);

        const { data: catData } = await supabase
          .from('categories')
          .select('slug, label, path')
          .eq('slug', data.category_slug)
          .single();
        setCategory(catData ?? null);

        if (user) {
          if (data.path === 'escrow') {
            const { data: bidData } = await supabase
              .from('bids')
              .select('id, tasker_id, amount, message, status, created_at')
              .eq('task_id', taskId)
              .eq('tasker_id', user.id)
              .maybeSingle();
            setMyBid(bidData ?? null);
          } else {
            const { data: leadData } = await supabase
              .from('leads')
              .select('id, status')
              .eq('task_id', taskId)
              .eq('professional_id', user.id)
              .maybeSingle();
            setMyLead(leadData ?? null);
          }

          if (data.status === 'completed') {
            const { data: reviewData } = await supabase
              .from('reviews')
              .select('id')
              .eq('task_id', taskId)
              .eq('reviewer_id', user.id)
              .maybeSingle();
            setHasReviewed(!!reviewData);
          }
        }

        setLoading(false);
      });
  }, [taskId, user]);

  async function handleGetLead() {
    if (!task) return;
    setLeadError(null);
    setLeadStarting(true);

    try {
      const authorizationUrl = await startLeadPayment(task.id);
      window.location.href = authorizationUrl;
    } catch (err) {
      setLeadStarting(false);
      setLeadError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function handleBidSubmit(e: FormEvent) {
    e.preventDefault();
    setBidError(null);

    if (!user || !task) return;

    setBidSubmitting(true);

    const { error } = await supabase.from('bids').insert({
      task_id: task.id,
      tasker_id: user.id,
      amount: Number(bidAmount),
      message: bidMessage || null,
    });

    setBidSubmitting(false);

    if (error) {
      setBidError(
        error.code === '23505' ? 'You already placed a bid on this task.' : error.message,
      );
      return;
    }

    setBidSubmitted(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <section className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-black text-gray-900">Task not found</h1>
        <p className="mt-2 text-gray-600">It may have been removed or the link is incorrect.</p>
        <Link to="/browse-tasks" className="mt-6 font-semibold text-primary hover:underline">
          Back to Browse Tasks
        </Link>
      </section>
    );
  }

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/browse-tasks"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Browse Tasks
        </Link>

        <div className="rounded-3xl border border-gray-200/70 bg-white p-8 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {category && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {category.label}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                task.path === 'escrow'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {task.path === 'escrow' ? 'Bid & Escrow' : 'Get Quotes'}
            </span>
            {task.status !== 'open' && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 capitalize">
                {task.status.replace('_', ' ')}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-black text-gray-900">{task.title}</h1>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {task.location_text ? `${task.location_text}, ` : ''}
              {task.city ?? 'Location not set'}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Wallet className="h-4 w-4 text-gray-500" />
              {formatBudget(task.budget_min, task.budget_max)}
            </span>
          </div>

          <p className="mt-6 leading-relaxed whitespace-pre-line text-gray-700">
            {task.description}
          </p>
        </div>

        {!isOwner && task.status === 'open' && task.path === 'lead_fee' && (
          <div className="mt-6 rounded-3xl border border-gray-200/70 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Get this lead</h2>
            </div>

            {!user ? (
              <p className="text-gray-600">
                <Link
                  to="/login"
                  state={{ from: { pathname: `/tasks/${task.id}` } }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </Link>{' '}
                to purchase this lead.
              </p>
            ) : myLead ? (
              <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-green-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">
                  {myLead.status === 'purchased'
                    ? "You've purchased this lead — contact details are unlocked below."
                    : 'Payment in progress. If you already paid, refresh this page in a moment.'}
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Pay a one-time fee of <strong className="text-gray-900">₦2,000</strong> to
                  unlock this poster's contact details and reach out directly to quote the job.
                </p>
                {leadError && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {leadError}
                  </div>
                )}
                <button
                  onClick={handleGetLead}
                  disabled={leadStarting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {leadStarting ? 'Redirecting to payment…' : 'Pay ₦2,000 to Unlock Lead'}
                </button>
              </div>
            )}
          </div>
        )}

        {!isOwner && task.status === 'open' && task.path === 'escrow' && (
          <div className="mt-6 rounded-3xl border border-gray-200/70 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Place a bid</h2>
            </div>

            {!user ? (
              <p className="text-gray-600">
                <Link
                  to="/login"
                  state={{ from: { pathname: `/tasks/${task.id}` } }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </Link>{' '}
                to place a bid.
              </p>
            ) : myBid || bidSubmitted ? (
              <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-green-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">
                  You've already bid on this task
                  {myBid ? ` — ₦${myBid.amount.toLocaleString('en-NG')}` : ''}. The poster will
                  review and respond.
                </span>
              </div>
            ) : (
              <form onSubmit={handleBidSubmit} className="space-y-4">
                {bidError && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {bidError}
                  </div>
                )}
                <div>
                  <label
                    htmlFor="bidAmount"
                    className="mb-1.5 block text-sm font-semibold text-gray-900"
                  >
                    Your price for the work (₦)
                  </label>
                  <input
                    id="bidAmount"
                    type="number"
                    required
                    min={0}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    placeholder="8000"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    This is your labor/service price. If the job needs materials or supplies,
                    mention that in your message — you and the poster can agree on those
                    separately.
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="bidMessage"
                    className="mb-1.5 block text-sm font-semibold text-gray-900"
                  >
                    Message
                    <span className="ml-1 font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="bidMessage"
                    rows={3}
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    placeholder="Why you're a good fit, when you can start, etc."
                  />
                </div>
                <button
                  type="submit"
                  disabled={bidSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bidSubmitting ? 'Submitting…' : 'Submit Bid'}
                </button>
              </form>
            )}
          </div>
        )}

        {isOwner && (
          <div className="mt-6 rounded-2xl bg-blue-50 px-6 py-4 text-sm text-primary">
            This is your task.{' '}
            <button
              onClick={() => navigate('/my-tasks')}
              className="font-semibold underline hover:no-underline"
            >
              View and manage bids
            </button>
          </div>
        )}

        {showTaskerChat && (
          <div className="mt-6">
            <TaskChat
              taskId={task.id}
              currentUserId={user!.id}
              otherUserId={task.poster_id}
              otherUserLabel="the poster"
            />
          </div>
        )}

        {isAcceptedTasker && task.status === 'completed' && (
          <div className="mt-6 rounded-3xl border border-gray-200/70 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Task completed</h2>
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
      </div>
    </section>
  );
}
