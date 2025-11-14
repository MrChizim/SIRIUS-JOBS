/**
 * Public Controller
 * Lightweight endpoints for marketing pages that need live counters
 */

import { Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { sendSuccess } from '../utils/response.util';
import { User } from '../models/User.model';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { ProfessionalProfile } from '../models/ProfessionalProfile.model';
import { EmployerProfile } from '../models/EmployerProfile.model';
import { Job } from '../models/Job.model';
import { ConsultationSession } from '../models/ConsultationSession.model';

export const getOverviewStats = asyncHandler(async (_req, res: Response) => {
  const [users, workers, activeWorkers, professionals, employers, jobs, sessions, trustees] =
    await Promise.all([
      User.countDocuments(),
      WorkerProfile.countDocuments(),
      WorkerProfile.countDocuments({ 'subscription.status': 'active' }),
      ProfessionalProfile.countDocuments(),
      EmployerProfile.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      ConsultationSession.countDocuments(),
      WorkerProfile.countDocuments({
        'governmentId.documentUrl': { $exists: true, $ne: null },
      }),
    ]);

  return sendSuccess(res, {
    users,
    workers,
    activeWorkers,
    professionals,
    employers,
    jobs,
    sessions,
    trustees,
  });
});
