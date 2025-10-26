import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/categories', async (_req, res) => {
  const categories = await prisma.serviceCategory.findMany({
    include: {
      _count: { select: { artisans: true, jobs: true } },
    },
    orderBy: { label: 'asc' },
  });

  res.json(categories);
});

const providerQuerySchema = z.object({
  categoryId: z.string(),
  includeUnverified: z.boolean().optional(),
});

router.get('/providers', async (req, res) => {
  const filters = providerQuerySchema.safeParse(req.query);
  if (!filters.success) {
    return res.status(400).json({ errors: filters.error.flatten() });
  }

  const providers = await prisma.artisanProfile.findMany({
    where: {
      serviceCategoryId: filters.data.categoryId,
      verifiedBadge: filters.data.includeUnverified ? undefined : true,
      subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] },
    },
    select: {
      id: true,
      userId: true,
      bio: true,
      yearsExperience: true,
      hireCount: true,
      averageRating: true,
      showcaseMediaUrl: true,
      verifiedBadge: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          verificationStatus: true,
          profileCompletion: true,
        },
      },
    },
    orderBy: [{ verifiedBadge: 'desc' }, { hireCount: 'desc' }],
  });

  res.json(providers);
});

const subscriptionSchema = z.object({
  categoryId: z.string(),
  plan: z.enum(['TRIAL', 'ACTIVE']).default('ACTIVE'),
  expiresAt: z.string().optional(),
});

router.post(
  '/providers/subscribe',
  requireAuth(['ARTISAN', 'DOCTOR', 'LAWYER']),
  async (req: AuthenticatedRequest, res) => {
    const payload = subscriptionSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ errors: payload.error.flatten() });
    }

    const profile = await prisma.artisanProfile.upsert({
      where: { userId: req.user!.id },
      update: {
        serviceCategoryId: payload.data.categoryId,
        subscriptionStatus: payload.data.plan,
        subscriptionEndsAt: payload.data.expiresAt ? new Date(payload.data.expiresAt) : undefined,
      },
      create: {
        userId: req.user!.id,
        serviceCategoryId: payload.data.categoryId,
        subscriptionStatus: payload.data.plan,
        subscriptionEndsAt: payload.data.expiresAt ? new Date(payload.data.expiresAt) : undefined,
      },
    });

    res.json(profile);
  },
);

export default router;
