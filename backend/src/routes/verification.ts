import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { verifyGovernmentId, markVerificationResult } from '../services/verification.js';
import { events } from '../services/event-bus.js';

const router = express.Router();

const submissionSchema = z.object({
  type: z.enum(['NIN', 'DRIVERS_LICENSE', 'INTERNATIONAL_PASSPORT']),
  identifier: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

router.post('/', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const payload = submissionSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const submission = await prisma.verificationSubmission.create({
    data: {
      userId: req.user!.id,
      type: payload.data.type,
      status: 'PENDING',
      payload: payload.data.metadata,
    },
  });

  res.status(202).json({ submissionId: submission.id, status: submission.status });

  // In production you would hand this off to a queue/worker.
  try {
    const result = await verifyGovernmentId({
      userId: req.user!.id,
      type: payload.data.type,
      identifier: payload.data.identifier,
      metadata: payload.data.metadata,
    });

    if (result.status === 'VERIFIED') {
      await markVerificationResult(submission.id, 'VERIFIED', result.reference, result.details);
      events.emit('notification:new', {
        userId: req.user!.id,
        title: 'Verification complete',
        message: 'Your identity documents were verified successfully.',
      });
    } else {
      await markVerificationResult(submission.id, 'REJECTED', result.reference, result.details);
      events.emit('notification:new', {
        userId: req.user!.id,
        title: 'Verification failed',
        message: 'We could not verify your identity documents. Please try again.',
      });
    }
  } catch (error) {
    await markVerificationResult(submission.id, 'REJECTED');
  }
});

router.get('/status', requireAuth(), async (req: AuthenticatedRequest, res) => {
  const submissions = await prisma.verificationSubmission.findMany({
    where: { userId: req.user!.id },
    orderBy: { submittedAt: 'desc' },
  });

  res.json(submissions);
});

export default router;
