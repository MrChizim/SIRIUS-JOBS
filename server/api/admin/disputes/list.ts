import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../src/cors.js';
import { supabaseAdmin } from '../../../src/supabaseAdmin.js';
import { requireAdmin } from '../../../src/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAdmin(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select(
      `id, task_id, raised_by, reason, status, resolution_notes, created_at, resolved_at,
       tasks!inner (
         id, title, status, poster_id,
         profiles!poster_id ( full_name ),
         escrow_transactions ( id, amount, commission_amount, payout_amount, paystack_reference, status ),
         bids ( tasker_id, status, profiles!tasker_id ( full_name ) )
       )`,
    )
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ disputes: data });
}
