import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../src/supabaseAdmin.js';
import { requireAdmin } from '../../../src/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAdmin(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { requestId, decision, notes } = req.body ?? {};
  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({ error: 'requestId is required' });
  }
  if (decision !== 'approve' && decision !== 'reject') {
    return res.status(400).json({ error: 'decision must be "approve" or "reject"' });
  }

  const rpcName = decision === 'approve' ? 'approve_verified_badge' : 'reject_verified_badge';

  const { error } = await supabaseAdmin.rpc(rpcName, {
    p_request_id: requestId,
    p_reviewer_notes: typeof notes === 'string' && notes ? notes : null,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ status: decision === 'approve' ? 'approved' : 'rejected' });
}
