import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../src/cors.js';
import { supabaseAdmin } from '../../../src/supabaseAdmin.js';
import { requireAdmin } from '../../../src/adminAuth.js';

async function handleList(res: VercelResponse) {
  const { data, error } = await supabaseAdmin
    .from('reports')
    .select(
      `id, reporter_id, target_type, task_id, reported_user_id, reason, status, admin_notes,
       created_at, resolved_at,
       reporter:profiles!reporter_id ( full_name ),
       task:tasks ( title ),
       reported_user:profiles!reported_user_id ( full_name )`,
    )
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ reports: data });
}

async function handleDecide(req: VercelRequest, res: VercelResponse) {
  const { reportId, decision, notes } = req.body ?? {};
  if (!reportId || typeof reportId !== 'string') {
    return res.status(400).json({ error: 'reportId is required' });
  }
  if (decision !== 'reviewed' && decision !== 'dismissed') {
    return res.status(400).json({ error: 'decision must be "reviewed" or "dismissed"' });
  }

  const { error } = await supabaseAdmin
    .from('reports')
    .update({
      status: decision,
      admin_notes: typeof notes === 'string' && notes ? notes : null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('status', 'open');

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ status: decision });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const auth = await requireAdmin(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    return handleList(res);
  }
  if (req.method === 'POST') {
    return handleDecide(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
