import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import type { VerificationType } from '@prisma/client';

type VerificationPayload = {
  userId: string;
  type: VerificationType;
  identifier: string;
  metadata?: Record<string, unknown>;
};

function resolveEndpoint(type: VerificationType) {
  switch (type) {
    case 'NIN':
      return process.env.NIN_VERIFICATION_URL;
    case 'DRIVERS_LICENSE':
      return process.env.DL_VERIFICATION_URL;
    case 'INTERNATIONAL_PASSPORT':
      return process.env.PASSPORT_VERIFICATION_URL;
    default:
      throw new Error('Unsupported verification type');
  }
}

export async function verifyGovernmentId(payload: VerificationPayload) {
  const endpoint = resolveEndpoint(payload.type);

  if (!endpoint) {
    throw new Error(`Missing verification endpoint for ${payload.type}`);
  }

  // NOTE: Real implementations require API keys and compliance with each provider.
  // The code below assumes a modern REST API that returns {status: 'VERIFIED' | 'FAILED'}
  const response = await axios.post(
    endpoint,
    {
      user: payload.userId,
      identifier: payload.identifier,
      metadata: payload.metadata ?? {},
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.VERIFICATION_API_KEY}`,
      },
      timeout: 10_000,
    },
  );

  return response.data as { status: 'VERIFIED' | 'FAILED'; reference?: string; details?: unknown };
}

export async function markVerificationResult(
  submissionId: string,
  status: 'VERIFIED' | 'REJECTED',
  reference?: string,
  details?: unknown,
) {
  await prisma.verificationSubmission.update({
    where: { id: submissionId },
    data: {
      status,
      reviewedAt: new Date(),
      externalRef: reference,
      payload: details ? (details as Record<string, unknown>) : undefined,
    },
  });

  if (status === 'VERIFIED') {
    const submission = await prisma.verificationSubmission.findUnique({
      where: { id: submissionId },
      select: { userId: true },
    });

    if (submission) {
      await prisma.user.update({
        where: { id: submission.userId },
        data: {
          verificationStatus: 'VERIFIED',
          isVerified: true,
        },
      });

      await prisma.artisanProfile.updateMany({
        where: { userId: submission.userId },
        data: { verifiedBadge: true },
      });

      await prisma.professionalProfile.updateMany({
        where: { userId: submission.userId },
        data: { verifiedBadge: true },
      });

      await prisma.employerProfile.updateMany({
        where: { userId: submission.userId },
        data: { verifiedBadge: true },
      });
    }
  }
}
