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

const professionalProfileSchema = z.object({
  profileImageUrl: z
    .string()
    .min(10, 'Provide a valid image payload')
    .max(500_000, 'Image payload too large')
    .optional(),
  regulatoryBody: z.string().min(2).max(120).optional(),
  profession: z.string().min(2).max(120).optional(),
});

router.put('/professional/me', requireAuth(['DOCTOR', 'LAWYER']), async (req: AuthenticatedRequest, res) => {
  const payload = professionalProfileSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const profile = await prisma.professionalProfile.update({
    where: { userId: req.user!.id },
    data: {
      profileImageUrl: payload.data.profileImageUrl,
      regulatoryBody: payload.data.regulatoryBody,
      profession: payload.data.profession ?? undefined,
    },
    select: {
      profileImageUrl: true,
      regulatoryBody: true,
      profession: true,
      onboardingPaid: true,
      licenseVerified: true,
      licenseNumber: true,
    },
  });

  res.json({ message: 'Professional profile updated', profile });
});

const completionSchema = z.object({
  completion: z.number().int().min(0).max(100),
});

router.post(
  '/professional/completion',
  requireAuth(['DOCTOR', 'LAWYER']),
  async (req: AuthenticatedRequest, res) => {
    const payload = completionSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ errors: payload.error.flatten() });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        profileCompletion: payload.data.completion,
        lastProfileAudit: new Date(),
      },
      select: { profileCompletion: true, lastProfileAudit: true },
    });

    res.json({ message: 'Profile completion updated', profileCompletion: user.profileCompletion });
  },
);

export default router;
