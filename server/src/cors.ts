import type { VercelRequest, VercelResponse } from '@vercel/node';

// Every api/ route runs on a different origin (sirius-jobs-server.vercel.app) than
// the browser app (www.siriusjobs.com.ng), so every response needs CORS headers or
// the browser silently blocks it before our handler code ever gets a say. Returns
// true if the request was a preflight OPTIONS and has already been responded to —
// callers should return immediately when this happens.
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
