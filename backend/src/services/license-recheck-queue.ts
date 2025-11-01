import { setTimeout as delay } from 'node:timers/promises';
import { prisma } from '../lib/prisma.js';
import { events } from './event-bus.js';
import { verifyProfessionalLicenseStub } from './verification.js';

type LicenseRecheckJob = {
  userId: string;
  licenseNumber: string;
  regulatoryBody: string;
  runAt: Date;
};

const LICENSE_REVIEW_INTERVAL_MS = Number(
  process.env.LICENSE_REVIEW_INTERVAL_MS ?? 1000 * 60 * 60 * 24 * 30,
);
const MIN_DELAY_MS = 1000 * 60 * 5; // 5 minutes
const POLL_INTERVAL_MS = 1000 * 15;

const queue: LicenseRecheckJob[] = [];
let workerRunning = false;

function normalizeRunDate(input?: Date | string) {
  if (!input) {
    return new Date(Date.now() + LICENSE_REVIEW_INTERVAL_MS);
  }
  const candidate = new Date(input);
  if (Number.isNaN(candidate.getTime())) {
    return new Date(Date.now() + LICENSE_REVIEW_INTERVAL_MS);
  }
  return candidate;
}

function sortQueue() {
  queue.sort((a, b) => a.runAt.getTime() - b.runAt.getTime());
}

export function scheduleLicenseRecheck(options: {
  userId: string;
  licenseNumber: string;
  regulatoryBody: string;
  delayMs?: number;
  runAt?: Date | string;
}) {
  const { userId, licenseNumber, regulatoryBody, delayMs, runAt } = options;
  if (!userId || !licenseNumber || !regulatoryBody) {
    return;
  }

  const baseRunAt = runAt
    ? normalizeRunDate(runAt)
    : new Date(
        Date.now() + Math.max(typeof delayMs === 'number' ? delayMs : LICENSE_REVIEW_INTERVAL_MS, MIN_DELAY_MS),
      );

  for (let i = queue.length - 1; i >= 0; i -= 1) {
    if (queue[i].userId === userId) {
      queue.splice(i, 1);
    }
  }

  queue.push({
    userId,
    licenseNumber,
    regulatoryBody,
    runAt: baseRunAt,
  });
  sortQueue();
}

async function processJob(job: LicenseRecheckJob) {
  const result = await verifyProfessionalLicenseStub({
    userId: job.userId,
    licenseNumber: job.licenseNumber,
    regulatoryBody: job.regulatoryBody,
  });

  const now = new Date();

  await prisma.professionalLicenseAudit.create({
    data: {
      userId: job.userId,
      licenseNumber: job.licenseNumber,
      regulatoryBody: job.regulatoryBody,
      status: result.status,
      notes: result.notes,
      checkedBy: 'auto-scheduler',
    },
  });

  await prisma.professionalProfile.updateMany({
    where: { userId: job.userId },
    data: {
      lastLicenseCheckAt: now,
      lastLicenseCheckStatus: result.status,
      licenseVerified: result.status === 'VERIFIED',
    },
  });

  const notificationMessage =
    result.status === 'VERIFIED'
      ? `We re-verified your ${job.regulatoryBody} licence ending in ${job.licenseNumber.slice(-4)}.`
      : `We could not confirm your ${job.regulatoryBody} licence automatically. Upload updated documents so we can review manually.`;

  await prisma.notification.create({
    data: {
      userId: job.userId,
      title: 'Professional licence check update',
      message: notificationMessage,
      metadata: {
        status: result.status,
        regulatoryBody: job.regulatoryBody,
        licenseNumber: job.licenseNumber,
      },
    },
  });

  events.emit('notification:new', {
    userId: job.userId,
    title: 'Professional licence check update',
    message: notificationMessage,
    metadata: {
      status: result.status,
      regulatoryBody: job.regulatoryBody,
      licenseNumber: job.licenseNumber,
    },
  });

  const nextDelay =
    result.status === 'VERIFIED'
      ? LICENSE_REVIEW_INTERVAL_MS
      : Math.max(Math.floor(LICENSE_REVIEW_INTERVAL_MS / 4), MIN_DELAY_MS);

  scheduleLicenseRecheck({
    userId: job.userId,
    licenseNumber: job.licenseNumber,
    regulatoryBody: job.regulatoryBody,
    delayMs: nextDelay,
  });
}

export async function startLicenseRecheckWorker() {
  if (workerRunning) {
    return;
  }
  workerRunning = true;

  (async () => {
    while (workerRunning) {
      const nextJob = queue[0];
      if (!nextJob) {
        await delay(POLL_INTERVAL_MS);
        continue;
      }
      const now = Date.now();
      const waitTime = nextJob.runAt.getTime() - now;
      if (waitTime > 0) {
        await delay(Math.min(waitTime, POLL_INTERVAL_MS));
        continue;
      }

      queue.shift();
      try {
        await processJob(nextJob);
      } catch (error) {
        console.error('License recheck job failed', error);
        scheduleLicenseRecheck({
          userId: nextJob.userId,
          licenseNumber: nextJob.licenseNumber,
          regulatoryBody: nextJob.regulatoryBody,
          delayMs: Math.max(Math.floor(LICENSE_REVIEW_INTERVAL_MS / 6), MIN_DELAY_MS),
        });
      }
    }
  })().catch(error => console.error('License recheck worker crashed', error));
}

export function stopLicenseRecheckWorker() {
  workerRunning = false;
}

export async function primeLicenseQueueFromDatabase() {
  const profiles = await prisma.professionalProfile.findMany({
    where: {
      licenseVerified: true,
      licenseNumber: { not: null },
      regulatoryBody: { not: null },
    },
    select: {
      userId: true,
      licenseNumber: true,
      regulatoryBody: true,
      lastLicenseCheckAt: true,
    },
    take: 250,
  });

  const now = Date.now();
  for (const profile of profiles) {
    if (!profile.licenseNumber || !profile.regulatoryBody) {
      continue;
    }
    const lastCheck = profile.lastLicenseCheckAt?.getTime() ?? 0;
    const elapsed = now - lastCheck;
    const remaining = LICENSE_REVIEW_INTERVAL_MS - elapsed;
    const delayMs = Math.max(remaining, MIN_DELAY_MS);
    scheduleLicenseRecheck({
      userId: profile.userId,
      licenseNumber: profile.licenseNumber,
      regulatoryBody: profile.regulatoryBody,
      delayMs,
    });
  }
}

export function getScheduledLicenseJobs(): LicenseRecheckJob[] {
  return [...queue];
}
