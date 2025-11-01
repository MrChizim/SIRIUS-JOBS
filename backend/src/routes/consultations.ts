import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const crossConsultSchema = z.object({
  professionalEmail: z.string().email(),
  targetProfession: z.enum(['LAWYER', 'DOCTOR']),
  reason: z.string().min(10).max(500),
  preferredDate: z.string().optional(),
  mode: z.enum(['VIDEO', 'PHONE', 'IN_PERSON']).optional(),
});

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

router.post('/cross-book', async (req, res) => {
  const payload = crossConsultSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const email = payload.data.professionalEmail.toLowerCase();
  const requester = await prisma.user.findUnique({
    where: { email },
    include: { professionalProfile: true },
  });

  if (!requester || (requester.role !== 'DOCTOR' && requester.role !== 'LAWYER')) {
    return res.status(403).json({ message: 'Only verified doctors or lawyers can request cross-discipline consultations.' });
  }

  if (requester.role === payload.data.targetProfession) {
    return res.status(400).json({ message: 'Select a different profession from your own.' });
  }
  if (requester.role === 'DOCTOR' && payload.data.targetProfession !== 'LAWYER') {
    return res.status(400).json({ message: 'Doctors can request lawyers via this feature.' });
  }
  if (requester.role === 'LAWYER' && payload.data.targetProfession !== 'DOCTOR') {
    return res.status(400).json({ message: 'Lawyers can request doctors via this feature.' });
  }

  const target = await prisma.user.findFirst({
    where: { role: payload.data.targetProfession },
    include: { professionalProfile: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!target || !target.professionalProfile) {
    return res.status(404).json({ message: `We could not find an available ${payload.data.targetProfession.toLowerCase()}. Try again later.` });
  }

  const preferredDate = payload.data.preferredDate ? new Date(payload.data.preferredDate) : null;
  const scheduledFor = preferredDate && !Number.isNaN(preferredDate.getTime())
    ? preferredDate
    : new Date(Date.now() + 36 * 60 * 60 * 1000); // default to ~36 hours ahead

  const consultation = await prisma.consultation.create({
    data: {
      professionalId: target.professionalProfile.id,
      clientId: requester.id,
      scheduledFor,
      status: 'PENDING',
      fee: 3000,
      payoutStatus: 'REQUESTED',
    },
  });

  res.status(201).json({
    message: `Consultation booked with ${target.firstName} ${target.lastName}. Our concierge will finalise the schedule.`,
    consultationId: consultation.id,
    scheduledFor: consultation.scheduledFor,
    assignedProfessional: {
      id: target.professionalProfile.id,
      name: `${target.firstName} ${target.lastName}`.trim(),
      role: target.role,
    },
  });
});

export default router;
