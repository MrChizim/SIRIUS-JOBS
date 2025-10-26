import express from 'express';
import { z } from 'zod';
import { initializePayment, verifyPayment } from '../services/paystack.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { prisma, withTransaction } from '../lib/prisma.js';
import { events } from '../services/event-bus.js';

const router = express.Router();

const applyProfessionalSchema = z.object({
  profession: z.enum(['DOCTOR', 'LAWYER']),
  email: z.string().email().optional(),
});

router.post(
  '/professional/apply',
  requireAuth(['ARTISAN', 'DOCTOR', 'LAWYER']),
  async (req: AuthenticatedRequest, res) => {
    const payload = applyProfessionalSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ errors: payload.error.flatten() });
    }

    const reference = `PRO-${payload.data.profession}-${Date.now()}`;
    const payment = await initializePayment({
      email: payload.data.email ?? req.user!.email,
      amount: 1000 * 100, // Paystack expects kobo
      reference,
      metadata: {
        userId: req.user!.id,
        profession: payload.data.profession,
        companyShare: 500,
        providerShare: 2500,
      },
    });

    await prisma.payoutRequest.create({
      data: {
        userId: req.user!.id,
        amount: 1000 * 100,
        status: 'PROCESSING',
        externalRef: reference,
      },
    });

    res.json(payment);
  },
);

const verifySchema = z.object({
  reference: z.string(),
});

router.post('/verify', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const payload = verifySchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const { data } = await verifyPayment(payload.data.reference);

  if (data.status !== 'success') {
    return res.status(409).json({ message: 'Payment not successful yet' });
  }

  await withTransaction(async tx => {
    await tx.payoutRequest.updateMany({
      where: { userId: req.user!.id, externalRef: payload.data.reference },
      data: { status: 'PAID', processedAt: new Date() },
    });

    await tx.wallet.upsert({
      where: { userId: req.user!.id },
      update: { available: { increment: 2500 * 100 } },
      create: { userId: req.user!.id, available: 2500 * 100, pending: 0 },
    });
  });

  events.emit('notification:new', {
    userId: req.user!.id,
    title: 'Professional listing activated',
    message: 'Your professional listing payment was received. Complete your profile to appear in searches.',
  });

  res.json({ message: 'Payment verified and wallet updated' });
});

export default router;
