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

  const licenseAudits = await prisma.professionalLicenseAudit.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const userRecord = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { profileCompletion: true, emailVerifiedAt: true },
  });

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
    licenseAudits,
    user: userRecord,
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
  const employerId = req.user!.id;

  const employer = await prisma.user.findUnique({
    where: { id: employerId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      employerProfile: {
        select: {
          companyName: true,
          industry: true,
          verifiedBadge: true,
        },
      },
    },
  });

  if (!employer) {
    return res.status(404).json({ message: 'Employer account not found' });
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCHours(0, 0, 0, 0);
  startOfMonth.setUTCDate(1);

  const [jobs, applicantRecords, totalHires, hiresThisMonth] = await Promise.all([
    prisma.job.findMany({
      where: { postedById: employerId },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.jobApplication.findMany({
      where: {
        job: { postedById: employerId },
        status: 'PENDING',
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            city: true,
            status: true,
          },
        },
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                serviceCategory: {
                  select: { label: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.hireAction.count({ where: { employerId, decision: 'ACCEPTED' } }),
    prisma.hireAction.count({
      where: {
        employerId,
        decision: 'ACCEPTED',
        confirmedAt: { gte: startOfMonth },
      },
    }),
  ]);

  const jobsPostedThisMonth = jobs.filter(job => job.createdAt >= startOfMonth).length;
  const freePostAllowance = 0;
  const freeHireAllowance = 1;

  const jobsResponse = jobs.map(job => {
    const statusNormalized = (job.status ?? '').toString();
    const statusLower = statusNormalized.toLowerCase();
    const statusLabel = statusLower ? `${statusLower.charAt(0).toUpperCase()}${statusLower.slice(1)}` : 'Pending';

    return {
      id: job.id,
      title: job.title,
      city: job.city,
      location: job.location,
      status: statusNormalized,
      statusLabel,
      applicants: job._count.applications,
      createdAt: job.createdAt.toISOString(),
    };
  });

  const applicantsResponse = applicantRecords.map(application => {
    const applicant = application.applicant;
    const serviceLabel = application.applicant.artisanProfile?.serviceCategory?.label ?? null;
    const applicantName = `${applicant.firstName} ${applicant.lastName}`.trim();
    return {
      id: application.id,
      jobId: application.jobId,
      jobTitle: application.job.title,
      userId: applicant.id,
      name: applicantName,
      skill: serviceLabel,
      location: application.job.city ?? application.job.location ?? null,
      status: application.status,
      appliedAt: application.createdAt.toISOString(),
      coverLetter: application.coverLetter ?? null,
      expectedPay: application.expectedPay ?? null,
      attachments: Array.isArray(application.attachments) ? application.attachments : [],
    };
  });

  const totalApplicants = jobs.reduce((count, job) => count + job._count.applications, 0);
  const activeListings = jobs.filter(job => (job.status ?? '').toUpperCase() === 'OPEN').length;

  const freePostsLeft = Math.max(freePostAllowance - jobsPostedThisMonth, 0);
  const freeHiresLeft = Math.max(freeHireAllowance - hiresThisMonth, 0);
  const personalName = `${employer.firstName} ${employer.lastName}`.trim();
  const fallbackEmployerName = personalName.length > 0 ? personalName : null;

  res.json({
    profile: {
      name: employer.employerProfile?.companyName ?? fallbackEmployerName,
      location: null,
      industry: employer.employerProfile?.industry ?? null,
      logoUrl: null,
      verified: Boolean(employer.employerProfile?.verifiedBadge),
      contactEmail: employer.email,
    },
    stats: {
      jobsPosted: jobs.length,
      totalApplicants,
      totalHires,
      activeListings,
      hiresThisMonth,
    },
    jobs: jobsResponse,
    applicants: applicantsResponse,
    plan: {
      tier: 'FREE',
      freePostsLeft,
      freeHiresLeft,
      directRecommendationCredits: 0,
      premiumPlusActive: false,
      paidPostReady: false,
      jobsPostedThisMonth,
    },
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
