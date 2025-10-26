import express from 'express';
import { z } from 'zod';
import { prisma, withTransaction } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { events } from '../services/event-bus.js';

const router = express.Router();

const applySchema = z.object({
  jobId: z.string(),
  coverLetter: z.string().min(20).optional(),
  expectedPay: z.number().int().positive().optional(),
});

const decisionSchema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT']),
  reason: z.string().optional(),
});

router.post('/', requireAuth(['ARTISAN', 'DOCTOR', 'LAWYER']), async (req: AuthenticatedRequest, res) => {
  const payload = applySchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const job = await prisma.job.findUnique({
    where: { id: payload.data.jobId },
    select: { id: true, status: true, postedById: true },
  });

  if (!job || job.status !== 'OPEN') {
    return res.status(404).json({ message: 'Job is no longer open' });
  }

  const existing = await prisma.jobApplication.findFirst({
    where: { jobId: job.id, applicantId: req.user!.id },
  });

  if (existing) {
    return res.status(409).json({ message: 'You already applied for this job' });
  }

  const application = await prisma.jobApplication.create({
    data: {
      jobId: payload.data.jobId,
      applicantId: req.user!.id,
      coverLetter: payload.data.coverLetter,
      expectedPay: payload.data.expectedPay,
    },
  });

  await prisma.notification.create({
    data: {
      userId: job.postedById,
      title: 'New job application',
      message: 'A worker has applied to your job. Review their profile now.',
      metadata: { applicationId: application.id },
    },
  });

  events.emit('notification:new', {
    userId: job.postedById,
    title: 'New job application',
    message: 'A worker has applied to your job. Review their profile now.',
    metadata: { applicationId: application.id },
  });

  res.status(201).json(application);
});

router.post('/:id/decision', requireAuth(['EMPLOYER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  const payload = decisionSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const application = await prisma.jobApplication.findUnique({
    where: { id: req.params.id },
    include: {
      job: true,
      applicant: true,
    },
  });

  if (!application) {
    return res.status(404).json({ message: 'Application not found' });
  }

  if (application.job.postedById !== req.user!.id) {
    return res.status(403).json({ message: 'You can only act on your own job applications' });
  }

  if (application.status !== 'PENDING') {
    return res.status(409).json({ message: 'Application already decided' });
  }

  await withTransaction(async tx => {
    await tx.jobApplication.update({
      where: { id: application.id },
      data: {
        status: payload.data.decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
      },
    });

    if (payload.data.decision === 'ACCEPT') {
      await tx.hireAction.create({
        data: {
          employerId: req.user!.id,
          artisanId: application.applicantId,
          jobId: application.jobId,
          decision: 'ACCEPTED',
        },
      });

      await tx.artisanProfile.updateMany({
        where: { userId: application.applicantId },
        data: { hireCount: { increment: 1 } },
      });
    } else {
      await tx.hireAction.create({
        data: {
          employerId: req.user!.id,
          artisanId: application.applicantId,
          jobId: application.jobId,
          decision: 'REJECTED',
          reason: payload.data.reason,
        },
      });
    }
  });

  await prisma.notification.create({
    data: {
      userId: application.applicantId,
      title:
        payload.data.decision === 'ACCEPT'
          ? 'Congratulations! Your application was accepted'
          : 'Update on your application',
      message:
        payload.data.decision === 'ACCEPT'
          ? `You were accepted for the role ${application.job.title}.`
          : `Your application for ${application.job.title} was declined.`,
      metadata: { jobId: application.jobId },
    },
  });

  events.emit('notification:new', {
    userId: application.applicantId,
    title:
      payload.data.decision === 'ACCEPT'
        ? 'Congratulations! Your application was accepted'
        : 'Update on your application',
    message:
      payload.data.decision === 'ACCEPT'
        ? `You were accepted for the role ${application.job.title}.`
        : `Your application for ${application.job.title} was declined.`,
    metadata: { jobId: application.jobId },
  });

  res.json({ message: 'Decision recorded' });
});

export default router;
