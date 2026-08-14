import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../src/cors.js';
import { supabaseAdmin } from '../../../src/supabaseAdmin.js';
import { requireAdmin } from '../../../src/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const auth = await requireAdmin(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [userCount, taskCounts, categoryBreakdown, escrowTotals] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tasks').select('status'),
    supabaseAdmin.from('tasks').select('category_slug, categories!inner(label)').eq('status', 'completed'),
    supabaseAdmin.from('escrow_transactions').select('amount, commission_amount').eq('status', 'released'),
  ]);

  if (taskCounts.error || categoryBreakdown.error || escrowTotals.error || userCount.error) {
    return res.status(500).json({
      error:
        userCount.error?.message ||
        taskCounts.error?.message ||
        categoryBreakdown.error?.message ||
        escrowTotals.error?.message,
    });
  }

  const tasksByStatus: Record<string, number> = {};
  for (const row of taskCounts.data ?? []) {
    tasksByStatus[row.status] = (tasksByStatus[row.status] ?? 0) + 1;
  }

  const categoryCounts = new Map<string, number>();
  for (const row of categoryBreakdown.data ?? []) {
    const label = (row.categories as unknown as { label: string } | null)?.label ?? row.category_slug;
    categoryCounts.set(label, (categoryCounts.get(label) ?? 0) + 1);
  }
  const topCategories = [...categoryCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalVolume = (escrowTotals.data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
  const totalCommission = (escrowTotals.data ?? []).reduce(
    (sum, t) => sum + Number(t.commission_amount),
    0,
  );

  return res.status(200).json({
    userCount: userCount.count ?? 0,
    tasksCompleted: tasksByStatus['completed'] ?? 0,
    tasksInProgress: tasksByStatus['in_progress'] ?? 0,
    tasksOpen: tasksByStatus['open'] ?? 0,
    topCategories,
    totalVolume,
    totalCommission,
  });
}
