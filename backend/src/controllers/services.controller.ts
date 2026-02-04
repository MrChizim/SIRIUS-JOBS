/**
 * Services Controller
 * Public service discovery endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { User } from '../models/User.model';
import { sendSuccess, sendError } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Get distinct service categories/skills
 * GET /api/v2/services/categories
 */
export const getServiceCategories = asyncHandler(async (_req, res: Response) => {
  const categories = await WorkerProfile.aggregate([
    { $unwind: '$skills' },
    { $group: { _id: { $toLower: '$skills' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ] as any);

  return sendSuccess(
    res,
    categories.map(category => ({
      name: category._id,
      count: category.count,
    }))
  );
});

/**
 * Get providers by skill and optional location
 * GET /api/v2/services/providers?skill=plumber&location=Lagos
 */
export const getProviders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const querySchema = z.object({
    skill: z.string().min(2),
    location: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  });

  const validation = querySchema.safeParse(req.query);
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }

  const { skill, location, page, limit } = validation.data;
  const filter: Record<string, any> = {
    'subscription.status': 'active',
    skills: { $regex: new RegExp(skill, 'i') },
  };

  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }

  const workers = await WorkerProfile.find(filter)
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await WorkerProfile.countDocuments(filter);

  const providers = await Promise.all(
    workers.map(async worker => {
      const user = await User.findById(worker.userId);
      return {
        worker: worker.toJSON(),
        user: user?.toJSON(),
      };
    })
  );

  return sendSuccess(res, {
    providers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
