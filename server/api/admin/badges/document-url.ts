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
