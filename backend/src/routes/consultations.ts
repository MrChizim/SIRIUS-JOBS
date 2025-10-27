import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.post('/:id/reviews', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const payload = reviewSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id: req.params.id },
  });

  if (!consultation) {
    return res.status(404).json({ message: 'Consultation not found' });
  }

  if (consultation.clientId !== req.user!.id) {
    return res.status(403).json({ message: 'You can only review your consultations' });
  }

  const review = await prisma.consultationReview.upsert({
    where: { consultationId: consultation.id },
    update: {
      rating: payload.data.rating,
      comment: payload.data.comment,
    },
    create: {
      consultationId: consultation.id,
      professionalId: consultation.professionalId,
      clientId: consultation.clientId,
      rating: payload.data.rating,
      comment: payload.data.comment,
    },
  });

  res.status(201).json(review);
});

router.get('/professionals/:professionalId/reviews', async (req, res) => {
  const reviews = await prisma.consultationReview.findMany({
    where: { professionalId: req.params.professionalId },
    include: {
      client: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;

  res.json({
    averageRating: average,
    reviews,
  });
});

export default router;
