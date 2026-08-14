import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, MapPin, Wallet, TrendingUp, CheckCircle2, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/types';

type TaskWithReason = Task & { reason: 'bid' | 'message' };

function formatBudget(min: number | null, max: number | null) {
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Budget not specified';
}

type TaskerStats = {
  totalEarnings: number;
  tasksCompleted: number;
  topCategories: { label: string; count: number }[];
};

function TaskerStatsSummary({ userId }: { userId: string }) {
  const [stats, setStats] = useState<TaskerStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('bids')
      .select(
        'status, task:tasks(status, category_slug, category:categories(label)), escrow_transactions(status, payout_amount)',
      )
      .eq('tasker_id', userId)
      .eq('status', 'accepted')
      .then(({ data }) => {
        if (cancelled || !data) return;

        let totalEarnings = 0;
        let tasksCompleted = 0;
        const categoryCounts = new Map<string, number>();

        for (const row of data as unknown as {
          task: { status: string; category_slug: string; category: { label: string } | null } | null;
          escrow_transactions: { status: string; payout_amount: number }[];
        }[]) {
          const released = row.escrow_transactions?.find((t) => t.status === 'released');
          if (released) totalEarnings += Number(released.payout_amount);

          if (row.task?.status === 'completed') {
            tasksCompleted += 1;
            const label = row.task.category?.label ?? row.task.category_slug;
            categoryCounts.set(label, (categoryCounts.get(label) ?? 0) + 1);
          }
        }

        const topCategories = [...categoryCounts.entries()]
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        setStats({ totalEarnings, tasksCompleted, topCategories });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!stats) return null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
          <TrendingUp className="h-4 w-4" />
        </div>
        <p className="text-xl font-black text-gray-900">
          ₦{stats.totalEarnings.toLocaleString('en-NG')}
        </p>
        <p className="text-xs text-gray-500">Total earnings</p>
      </div>
      <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <p className="text-xl font-black text-gray-900">{stats.tasksCompleted}</p>
        <p className="text-xs text-gray-500">Tasks completed</p>
      </div>
      {stats.topCategories.length > 0 && (
        <div className="col-span-2 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:col-span-1">
          <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Tag className="h-4 w-4" />
          </div>
          <p className="text-sm font-bold text-gray-900">
            {stats.topCategories.map((c) => c.label).join(', ')}
          </p>
          <p className="text-xs text-gray-500">Top categories</p>
        </div>
      )}
    </div>
  );
}

export default function MyBids({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<TaskWithReason[] | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('bids').select('task_id').eq('tasker_id', userId),
      supabase
        .from('messages')
        .select('task_id')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
    ]).then(async ([bidsRes, messagesRes]) => {
      const bidTaskIds = new Set((bidsRes.data ?? []).map((b) => b.task_id));
      const messageTaskIds = new Set((messagesRes.data ?? []).map((m) => m.task_id));
      const allTaskIds = new Set([...bidTaskIds, ...messageTaskIds]);

      if (allTaskIds.size === 0) {
        setTasks([]);
        return;
      }

      const { data: taskRows } = await supabase
        .from('tasks')
        .select('*')
        .in('id', Array.from(allTaskIds))
        .neq('poster_id', userId)
        .order('created_at', { ascending: false });

      setTasks(
        (taskRows ?? []).map((t) => ({
          ...t,
          reason: bidTaskIds.has(t.id) ? 'bid' : 'message',
        })),
      );
    });
  }, [userId]);

  if (tasks === null) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <>
        <TaskerStatsSummary userId={userId} />
        <div className="rounded-3xl border border-gray-200/70 bg-white p-10 text-center">
          <p className="text-gray-600">You haven't bid on or messaged about any tasks yet.</p>
          <Link
            to="/browse-tasks"
            className="mt-4 inline-block font-semibold text-primary hover:underline"
          >
            Browse open tasks
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-3">
      <TaskerStatsSummary userId={userId} />
      {tasks.map((task) => (
        <Link
          key={task.id}
          to={`/tasks/${task.id}`}
          className="block rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm transition-colors hover:border-primary/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-gray-900">{task.title}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {task.city ?? 'Location not set'}
                </span>
                <span className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  {formatBudget(task.budget_min, task.budget_max)}
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 capitalize">
              {task.status.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Gavel className="h-3 w-3" />
            {task.reason === 'bid' ? 'You bid on this task' : 'You messaged about this task'}
          </p>
        </Link>
      ))}
    </div>
  );
}
