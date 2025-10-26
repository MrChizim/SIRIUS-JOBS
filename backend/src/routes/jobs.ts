import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { events } from '../services/event-bus.js';

const router = express.Router();

const jobFilterSchema = z.object({
  categoryId: z.string().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

const createJobSchema = z.object({
  title: z.string().min(4),
  description: z.string().min(20),
  budget: z.number().int().positive().optional(),
  location: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  remoteFriendly: z.boolean().optional(),
  serviceCategoryId: z.string(),
});

router.get('/', async (req, res) => {
  const filters = jobFilterSchema.safeParse(req.query);
  if (!filters.success) {
    return res.status(400).json({ errors: filters.error.flatten() });
  }

  const { categoryId, location, search, status } = filters.data;
  const jobs = await prisma.job.findMany({
    where: {
      serviceCategoryId: categoryId,
      status,
      OR: search
        ? [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
      location: location ? { contains: location, mode: 'insensitive' } : undefined,
    },
    include: {
      serviceCategory: true,
      postedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employerProfile: { select: { companyName: true, verifiedBadge: true } },
        },
      },
      _count: {
        select: { applications: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(jobs);
});

router.post('/', requireAuth(['EMPLOYER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  const payload = createJobSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const job = await prisma.job.create({
    data: {
      ...payload.data,
      postedById: req.user!.id,
    },
    include: {
      serviceCategory: true,
    },
  });

  // Notify artisans subscribed to this category
  const subscribers = await prisma.alertSubscription.findMany({
    where: { serviceCategoryId: payload.data.serviceCategoryId, active: true },
  });

  await Promise.all(
    subscribers.map(subscription =>
      prisma.notification.create({
        data: {
          userId: subscription.userId,
          title: 'New job opportunity',
          message: `A new ${job.title} job was posted in your category.`,
          metadata: { jobId: job.id },
        },
      }),
    ),
  );

  subscribers.forEach(sub =>
    events.emit('notification:new', {
      userId: sub.userId,
      title: 'New job opportunity',
      message: `A new ${job.title} job was posted.`,
      metadata: { jobId: job.id },
    }),
  );

  res.status(201).json(job);
});

router.get('/:id', async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: {
      serviceCategory: true,
      postedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employerProfile: { select: { companyName: true, verifiedBadge: true } },
        },
      },
      applications: {
        include: {
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              artisanProfile: {
                select: {
                  serviceCategory: { select: { label: true } },
                  yearsExperience: true,
                  verifiedBadge: true,
                  hireCount: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  res.json(job);
});

export default router;
