import express from 'express';
import { z } from 'zod';
import { prisma, withTransaction } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { events } from '../services/event-bus.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  const profile = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      verificationStatus: true,
      profileCompletion: true,
      artisanProfile: {
        select: {
          id: true,
          serviceCategory: { select: { label: true } },
          bio: true,
          yearsExperience: true,
          hireCount: true,
          averageRating: true,
          verifiedBadge: true,
          subscriptionStatus: true,
        },
      },
      professionalProfile: {
        select: {
          profession: true,
          netEarnings: true,
          pendingEarnings: true,
          totalClientsServed: true,
          verifiedBadge: true,
        },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  res.json(profile);
});

const hireSchema = z.object({
  artisanId: z.string(),
  jobId: z.string().optional(),
  note: z.string().optional(),
});

router.post('/hire', requireAuth(['EMPLOYER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  const payload = hireSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const artisan = await prisma.user.findUnique({
    where: { id: payload.data.artisanId },
    select: { id: true, role: true },
  });

  if (!artisan || artisan.role === 'EMPLOYER') {
    return res.status(404).json({ message: 'Artisan not found' });
  }

  await withTransaction(async tx => {
    await tx.hireAction.create({
      data: {
        employerId: req.user!.id,
        artisanId: payload.data.artisanId,
        jobId: payload.data.jobId,
        decision: 'ACCEPTED',
        reason: payload.data.note,
      },
    });

    await tx.artisanProfile.updateMany({
      where: { userId: payload.data.artisanId },
      data: { hireCount: { increment: 1 } },
    });
  });

  await prisma.notification.create({
    data: {
      userId: payload.data.artisanId,
      title: 'You have a new hire request',
      message: 'An employer chose you directly from your profile.',
      metadata: { employerId: req.user!.id },
    },
  });

  events.emit('notification:new', {
    userId: payload.data.artisanId,
    title: 'You have a new hire request',
    message: 'An employer chose you directly from your profile.',
    metadata: { employerId: req.user!.id },
  });

  res.status(201).json({ message: 'Hire recorded successfully' });
});

export default router;
