import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const unlockSchema = z.object({
  professionalEmail: z.string().email(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(6).max(30).optional(),
  contactWhatsapp: z.string().url().optional(),
  scheduledFor: z.string().optional(),
});

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

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

async function ensureConsultationOwnership(id: string, userId: string) {
  return prisma.consultation.findUnique({
    where: { id },
    include: {
      professional: { select: { userId: true } },
    },
  }).then(consultation => {
    if (!consultation) {
      return null;
    }
    if (consultation.clientId !== userId && consultation.professional.userId !== userId) {
      return undefined;
    }
    return consultation;
  });
}

async function applyAutoExpiry(consultations: Array<{ id: string; status: string; expiresAt: Date | null; endedAt: Date | null; professionalId: string; clientId: string; }>) {
  const now = new Date();
  const expired = consultations.filter(
    item => item.status !== 'COMPLETED' && !item.endedAt && item.expiresAt && item.expiresAt <= now,
  );
  await Promise.all(
    expired.map(item =>
      prisma.consultation.update({
        where: { id: item.id },
        data: {
          status: 'EXPIRED',
          endedAt: now,
        },
      }),
    ),
  );
}

router.post('/unlock', requireAuth(['CLIENT']), async (req: AuthenticatedRequest, res) => {
  const payload = unlockSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const professionalEmail = payload.data.professionalEmail.toLowerCase();
  const professionalUser = await prisma.user.findUnique({
    where: { email: professionalEmail },
    include: { professionalProfile: true },
  });

  if (!professionalUser || !professionalUser.professionalProfile) {
    return res.status(404).json({ message: 'Professional not found' });
  }

  const scheduledFor =
    payload.data.scheduledFor && !Number.isNaN(Date.parse(payload.data.scheduledFor))
      ? new Date(payload.data.scheduledFor)
      : new Date();

  const consultation = await prisma.consultation.create({
    data: {
      professionalId: professionalUser.professionalProfile.id,
      clientId: req.user!.id,
      scheduledFor,
      status: 'ACTIVE',
      contactEmail: payload.data.contactEmail ?? professionalEmail,
      contactPhone: payload.data.contactPhone ?? null,
      contactWhatsapp: payload.data.contactWhatsapp ?? null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    include: {
      professional: {
        select: {
          id: true,
          profession: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      review: true,
    },
  });

  res.status(201).json({
    consultation,
  });
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

router.post('/:id/done', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const consultation = await ensureConsultationOwnership(req.params.id, req.user!.id);
  if (consultation === null) {
    return res.status(404).json({ message: 'Consultation not found' });
  }
  if (consultation === undefined) {
    return res.status(403).json({ message: 'You do not have access to this consultation' });
  }

  const updated = await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
    },
    include: {
      professional: {
        select: {
          id: true,
          profession: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      review: true,
    },
  });

  res.json(updated);
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

router.get('/client/me', requireAuth(['CLIENT']), async (req: AuthenticatedRequest, res) => {
  const consultations = await prisma.consultation.findMany({
    where: { clientId: req.user!.id },
    include: {
      professional: {
        select: {
          id: true,
          profession: true,
          verifiedBadge: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      review: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  await applyAutoExpiry(
    consultations.map(consultation => ({
      id: consultation.id,
      status: consultation.status,
      expiresAt: consultation.expiresAt,
      endedAt: consultation.endedAt,
      professionalId: consultation.professionalId,
      clientId: consultation.clientId,
    })),
  );

  res.json({
    consultations: consultations.map(item => ({
      id: item.id,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      scheduledFor: item.scheduledFor,
      endedAt: item.endedAt,
      expiresAt: item.expiresAt,
      professional: {
        id: item.professional.id,
        name: `${item.professional.user.firstName} ${item.professional.user.lastName}`.trim(),
        email: item.professional.user.email,
        profession: item.professional.profession,
        verified: item.professional.verifiedBadge,
      },
      review: item.review ?? null,
      contact: {
        email: item.contactEmail ?? item.professional.user.email,
        phone: item.contactPhone,
        whatsapp: item.contactWhatsapp,
      },
    })),
  });
});

router.get('/:id/messages', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const consultation = await ensureConsultationOwnership(req.params.id, req.user!.id);
  if (consultation === null) {
    return res.status(404).json({ message: 'Consultation not found' });
  }
  if (consultation === undefined) {
    return res.status(403).json({ message: 'You do not have access to this consultation' });
  }

  const messages = await prisma.consultationMessage.findMany({
    where: { consultationId: consultation.id },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  res.json({ messages });
});

router.post('/:id/messages', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const consultation = await ensureConsultationOwnership(req.params.id, req.user!.id);
  if (consultation === null) {
    return res.status(404).json({ message: 'Consultation not found' });
  }
  if (consultation === undefined) {
    return res.status(403).json({ message: 'You do not have access to this consultation' });
  }

  const payload = messageSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const message = await prisma.consultationMessage.create({
    data: {
      consultationId: consultation.id,
      senderId: req.user!.id,
      body: payload.data.body,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  res.status(201).json(message);
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
