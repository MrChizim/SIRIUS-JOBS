import type { VercelRequest, VercelResponse } from '@vercel/node';

// Every api/ route runs on a different origin (sirius-jobs-server.vercel.app) than
// the browser app (www.siriusjobs.com.ng), so every response needs CORS headers or
// the browser silently blocks it before our handler code ever gets a say.
//
// Reflecting the request's own Origin header back (rather than hardcoding one, e.g.
// via APP_URL) avoids a class of bug where the configured value doesn't exactly
// match what the browser sent (root domain vs. www, http vs. https, trailing slash),
// which silently breaks every request despite the preflight itself returning 200/204
// — this API is only ever meant to be called by our own frontend, so there's no
// security tradeoff in accepting whatever origin actually asked.
//
// Returns true if the request was a preflight OPTIONS and has already been responded
// to — callers should return immediately when this happens.
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
