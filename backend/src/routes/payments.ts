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

const initiatePublicProfessionalSchema = z.object({
  profession: z.enum(['DOCTOR', 'LAWYER']),
  email: z.string().email(),
  callbackUrl: z.string().url().optional(),
});

const verifyPublicProfessionalSchema = z.object({
  email: z.string().email(),
  reference: z.string().min(5),
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

router.post('/professional/initiate-public', async (req, res) => {
  const payload = initiatePublicProfessionalSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.data.email },
    include: { professionalProfile: true },
  });

  if (!user || user.role !== payload.data.profession) {
    return res.status(404).json({
      message: 'Professional account not found. Complete registration first.',
    });
  }

  const reference = `PRO-${payload.data.profession}-${Date.now()}`;
  const payment = await initializePayment({
    email: payload.data.email,
    amount: 1000 * 100,
    reference,
    callback_url: payload.data.callbackUrl,
    metadata: {
      userId: user.id,
      profession: payload.data.profession,
      companyShare: 500,
      providerShare: 2500,
    },
  });

  const existingRequest = await prisma.payoutRequest.findFirst({
    where: { userId: user.id, status: 'PROCESSING' },
    orderBy: { requestedAt: 'desc' },
  });

  if (existingRequest) {
    await prisma.payoutRequest.update({
      where: { id: existingRequest.id },
      data: {
        amount: 1000 * 100,
        externalRef: reference,
        processedAt: null,
        status: 'PROCESSING',
      },
    });
  } else {
    await prisma.payoutRequest.create({
      data: {
        userId: user.id,
        amount: 1000 * 100,
        status: 'PROCESSING',
        externalRef: reference,
      },
    });
  }

  res.json(payment);
});

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

router.post('/professional/verify-public', async (req, res) => {
  const payload = verifyPublicProfessionalSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.data.email },
  });

  if (!user) {
    return res.status(404).json({ message: 'Professional account not found.' });
  }

  const requestRecord = await prisma.payoutRequest.findFirst({
    where: { userId: user.id, externalRef: payload.data.reference },
  });

  if (!requestRecord) {
    return res.status(404).json({ message: 'Payment reference not recognized.' });
  }

  const { data } = await verifyPayment(payload.data.reference);

  if (data.status !== 'success') {
    return res.status(409).json({ message: 'Payment not successful yet' });
  }

  await withTransaction(async tx => {
    await tx.payoutRequest.updateMany({
      where: { userId: user.id, externalRef: payload.data.reference },
      data: { status: 'PAID', processedAt: new Date() },
    });

    await tx.wallet.upsert({
      where: { userId: user.id },
      update: { available: { increment: 2500 * 100 } },
      create: { userId: user.id, available: 2500 * 100, pending: 0 },
    });

    await tx.professionalProfile.updateMany({
      where: { userId: user.id },
      data: { subscriptionStatus: 'ACTIVE' },
    });
  });

  events.emit('notification:new', {
    userId: user.id,
    title: 'Professional listing activated',
    message: 'Your professional listing payment was received. Complete your profile to appear in searches.',
  });

  res.json({ message: 'Payment verified and wallet updated' });
});

export default router;
