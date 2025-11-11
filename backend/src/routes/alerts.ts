import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const subscribeSchema = z.object({
  serviceCategoryId: z.string(),
});

router.post('/', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const payload = subscribeSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const existing = await prisma.alertSubscription.findFirst({
    where: {
      userId: req.user!.id,
      serviceCategoryId: payload.data.serviceCategoryId,
    },
  });

  const subscription = existing
    ? await prisma.alertSubscription.update({
        where: { id: existing.id },
        data: { active: true },
      })
    : await prisma.alertSubscription.create({
        data: {
          userId: req.user!.id,
          serviceCategoryId: payload.data.serviceCategoryId,
        },
      });

  res.json(subscription);
});

router.get('/', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const subscriptions = await prisma.alertSubscription.findMany({
    where: { userId: req.user!.id, active: true },
    include: { serviceCategory: true },
  });

  res.json(subscriptions);
});

router.delete('/:id', requireAuth(), async (req: AuthenticatedRequest, res) => {
  await prisma.alertSubscription.update({
    where: { id: req.params.id },
    data: { active: false },
  });

  res.status(204).send();
});

export default router;
