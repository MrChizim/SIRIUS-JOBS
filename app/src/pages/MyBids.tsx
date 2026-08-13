import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, MapPin, Wallet } from 'lucide-react';
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
      <div className="rounded-3xl border border-gray-200/70 bg-white p-10 text-center">
        <p className="text-gray-600">You haven't bid on or messaged about any tasks yet.</p>
        <Link
          to="/browse-tasks"
          className="mt-4 inline-block font-semibold text-primary hover:underline"
        >
          Browse open tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
