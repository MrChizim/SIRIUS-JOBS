import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listBanks } from '../../src/paystack.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const banks = await listBanks();
    return res.status(200).json({ banks: banks.map((b) => ({ name: b.name, code: b.code })) });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to load banks.',
    });
  }
}
