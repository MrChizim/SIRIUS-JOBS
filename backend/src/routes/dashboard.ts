import express from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

router.get('/professional', requireAuth(['DOCTOR', 'LAWYER']), async (req: AuthenticatedRequest, res) => {
  const profile = await prisma.professionalProfile.findUnique({
    where: { userId: req.user!.id },
    include: {
      consultations: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!profile) {
    return res.status(404).json({ message: 'Professional profile not found' });
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: req.user!.id },
    include: { history: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });

  const [reviewAggregate, recentReviews] = await Promise.all([
    prisma.consultationReview.aggregate({
      where: { professionalId: req.user!.id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.consultationReview.findMany({
      where: { professionalId: req.user!.id },
      include: { client: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  res.json({
    profile,
    wallet,
    stats: {
      clientsServed: profile.totalClientsServed,
      netEarnings: profile.netEarnings,
      pendingEarnings: profile.pendingEarnings,
      consultationsScheduled: profile.consultations.filter(c => c.status === 'PENDING').length,
      averageRating: reviewAggregate._avg.rating ?? null,
      reviewCount: reviewAggregate._count.rating ?? 0,
    },
    payoutAccount: {
      bankName: profile.bankName,
      accountNumber: profile.accountNumber,
      accountHolder: profile.accountHolder,
    },
    reviews: recentReviews,
  });
});

const payoutSchema = z.object({
  bankName: z.string().min(2),
  accountNumber: z.string().min(6).max(20),
  accountHolder: z.string().min(3),
});

router.post('/professional/payout-account', requireAuth(['DOCTOR', 'LAWYER']), async (req: AuthenticatedRequest, res) => {
  const payload = payoutSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  await prisma.professionalProfile.update({
    where: { userId: req.user!.id },
    data: {
      bankName: payload.data.bankName,
      accountNumber: payload.data.accountNumber,
      accountHolder: payload.data.accountHolder,
    },
  });

  res.json({ message: 'Payout account updated' });
});

router.get('/employer', requireAuth(['EMPLOYER']), async (req: AuthenticatedRequest, res) => {
  const [jobs, hires] = await Promise.all([
    prisma.job.findMany({
      where: { postedById: req.user!.id },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.hireAction.count({ where: { employerId: req.user!.id, decision: 'ACCEPTED' } }),
  ]);

  res.json({
    recentJobs: jobs,
    totalHires: hires,
  });
});

router.get('/artisan', requireAuth(['ARTISAN']), async (req: AuthenticatedRequest, res) => {
  const profile = await prisma.artisanProfile.findUnique({
    where: { userId: req.user!.id },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  if (!profile) {
    return res.status(404).json({ message: 'Artisan profile not found' });
  }

  const applications = await prisma.jobApplication.findMany({
    where: { applicantId: req.user!.id },
    include: { job: { select: { title: true, location: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json({
    profile,
    applications,
  });
});

export default router;
