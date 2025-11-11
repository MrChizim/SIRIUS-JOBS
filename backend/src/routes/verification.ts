import express from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { verifyGovernmentId, markVerificationResult, verifyProfessionalLicenseStub } from '../services/verification.js';
import { scheduleLicenseRecheck } from '../services/license-recheck-queue.js';
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
      payload: payload.data.metadata as Prisma.JsonValue | undefined,
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

const licenseSchema = z.object({
  licenseNumber: z.string().min(4),
  regulatoryBody: z.string().min(2),
  licenseDocument: z.string().min(10),
});

router.post('/license', requireAuth(['DOCTOR', 'LAWYER']), async (req: AuthenticatedRequest, res) => {
  const payload = licenseSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  await prisma.professionalProfile.updateMany({
    where: { userId: req.user!.id },
    data: {
      licenseNumber: payload.data.licenseNumber,
      regulatoryBody: payload.data.regulatoryBody,
      licenseDocumentUrl: payload.data.licenseDocument,
      licenseVerified: false,
      licenseSubmittedAt: new Date(),
    },
  });

  res.json({ message: 'License documents submitted for review.' });
});

const licenseCheckSchema = z.object({
  licenseNumber: z.string().min(4),
  regulatoryBody: z.string().min(2),
});

router.post('/license/check', requireAuth(['DOCTOR', 'LAWYER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  const payload = licenseCheckSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const result = await verifyProfessionalLicenseStub({
    userId: req.user!.id,
    licenseNumber: payload.data.licenseNumber,
    regulatoryBody: payload.data.regulatoryBody,
  });

  await prisma.professionalLicenseAudit.create({
    data: {
      userId: req.user!.id,
      licenseNumber: payload.data.licenseNumber,
      regulatoryBody: payload.data.regulatoryBody,
      status: result.status,
      notes: result.notes,
      checkedBy: req.user?.id,
    },
  });

  await prisma.professionalProfile.updateMany({
    where: { userId: req.user!.id },
    data: {
      licenseVerified: result.status === 'VERIFIED',
      lastLicenseCheckAt: new Date(),
      lastLicenseCheckStatus: result.status,
      licenseNumber: payload.data.licenseNumber,
      regulatoryBody: payload.data.regulatoryBody,
    },
  });

  scheduleLicenseRecheck({
    userId: req.user!.id,
    licenseNumber: payload.data.licenseNumber,
    regulatoryBody: payload.data.regulatoryBody,
    delayMs: result.status === 'VERIFIED' ? undefined : 1000 * 60 * 60 * 24 * 7,
  });

  res.json({
    status: result.status,
    notes: result.notes,
  });
});

export default router;
