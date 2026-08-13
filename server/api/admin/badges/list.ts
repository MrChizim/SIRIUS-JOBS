import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../src/supabaseAdmin.js';
import { requireAdmin } from '../../../src/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAdmin(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { data, error } = await supabaseAdmin
    .from('verified_badge_requests')
    .select(
      'id, user_id, nin, id_document_url, fee_amount, status, reviewer_notes, created_at, reviewed_at, profiles(full_name)',
    )
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ requests: data });
}
