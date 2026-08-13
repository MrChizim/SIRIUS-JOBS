import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../../src/cors.js';
import { supabaseAdmin } from '../../../src/supabaseAdmin.js';
import { requireAdmin } from '../../../src/adminAuth.js';

async function handleList(res: VercelResponse) {
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

async function handleDecide(req: VercelRequest, res: VercelResponse) {
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

async function handleDocumentUrl(req: VercelRequest, res: VercelResponse) {
  const { path } = req.body ?? {};
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'path is required' });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('id-documents')
    .createSignedUrl(path, 300);

  if (error || !data) {
    return res.status(500).json({ error: error?.message || 'Could not create a signed URL' });
  }

  return res.status(200).json({ url: data.signedUrl });
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
    const { action } = req.body ?? {};
    if (action === 'document-url') {
      return handleDocumentUrl(req, res);
    }
    return handleDecide(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
