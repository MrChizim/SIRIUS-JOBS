/**
 * Worker Controller
 * Handle all worker-related requests
 */

import { Response } from 'express';
import { z } from 'zod';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { User } from '../models/User.model';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import * as analyticsService from '../services/analytics.service';
import { getWorkerSubscription } from '../services/subscription.service';

/**
 * Get worker profile
 * GET /api/workers/profile
 */
export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const user = await User.findById(userId);
  const workerProfile = await WorkerProfile.findOne({ userId });
  
  if (!user || !workerProfile) {
    return sendNotFound(res, 'Worker profile not found');
  }
  
  return sendSuccess(res, {
    user: user.toJSON(),
    profile: workerProfile,
  });
});

/**
 * Update worker profile
 * PUT /api/workers/profile
 */
export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const updateSchema = z.object({
    skills: z.array(z.string()).max(20).optional(),
    experience: z.string().max(2000).optional(),
    location: z.string().optional(),
    bio: z.string().max(500).optional(),
  });
  
  const validation = updateSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const workerProfile = await WorkerProfile.findOne({ userId });
  
  if (!workerProfile) {
    return sendNotFound(res, 'Worker profile not found');
  }
  
  // Update fields
  Object.assign(workerProfile, validation.data);
  await workerProfile.save();
  
  return sendSuccess(res, workerProfile, 'Profile updated successfully');
});

/**
 * Upload government ID
 * POST /api/workers/upload-id
 */
export const uploadGovernmentId = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const idSchema = z.object({
    type: z.enum(['nin', 'voters_card', 'drivers_license', 'international_passport']),
    documentUrl: z.string().url(),
  });
  
  const validation = idSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const workerProfile = await WorkerProfile.findOne({ userId });
  
  if (!workerProfile) {
    return sendNotFound(res, 'Worker profile not found');
  }
  
  workerProfile.governmentId = {
    type: validation.data.type,
    documentUrl: validation.data.documentUrl,
    verifiedAt: new Date(),
  };
  
  await workerProfile.save();
  
  return sendSuccess(res, workerProfile, 'Government ID uploaded successfully');
});

/**
 * Upload profile photo
 * POST /api/workers/upload-photo
 */
export const uploadProfilePhoto = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { photoUrl } = req.body;
  
  if (!photoUrl) {
    return sendError(res, 'Photo URL is required', 400);
  }
  
  const workerProfile = await WorkerProfile.findOne({ userId });
  
  if (!workerProfile) {
    return sendNotFound(res, 'Worker profile not found');
  }
  
  workerProfile.profilePhoto = photoUrl;
  await workerProfile.save();
  
  return sendSuccess(res, workerProfile, 'Profile photo updated successfully');
});

/**
 * Get worker subscription details
 * GET /api/workers/subscription
 */
export const getSubscription = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const subscription = await getWorkerSubscription(userId);
  
  return sendSuccess(res, subscription);
});

/**
 * Check if worker can appear publicly
 * GET /api/workers/can-appear-publicly
 */
export const canAppearPublicly = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const workerProfile = await WorkerProfile.findOne({ userId });
  
  if (!workerProfile) {
    return sendNotFound(res, 'Worker profile not found');
  }
  
  const canAppear = workerProfile.canAppearPublicly();
  
  return sendSuccess(res, {
    canAppearPublicly: canAppear,
    hasActiveSubscription: workerProfile.isSubscriptionActive(),
    hasGovernmentId: !!workerProfile.governmentId?.documentUrl,
  });
});

/**
 * Get worker analytics
 * GET /api/workers/analytics
 */
export const getAnalytics = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const analytics = await analyticsService.getWorkerAnalytics(userId);
  
  return sendSuccess(res, analytics);
});

/**
 * Get all workers (public endpoint)
 * GET /api/workers
 */
export const getAllWorkers = asyncHandler(async (req: any, res: Response) => {
  const { page = 1, limit = 20, skills, location } = req.query;
  
  const query: any = {
    'subscription.status': 'active',
  };
  
  // Filter by skills
  if (skills) {
    query.skills = { $in: (skills as string).split(',') };
  }
  
  // Filter by location
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }
  
  const workers = await WorkerProfile.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });
  
  const total = await WorkerProfile.countDocuments(query);
  
  // Get user details for each worker
  const workersWithUsers = await Promise.all(
    workers.map(async (worker) => {
      const user = await User.findById(worker.userId);
      return {
        ...worker.toJSON(),
        user: user?.toJSON(),
      };
    })
  );
  
  return sendSuccess(res, {
    workers: workersWithUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Get single worker by ID (public endpoint)
 * GET /api/workers/:id
 */
export const getWorkerById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  
  const workerProfile = await WorkerProfile.findOne({ userId: id });
  
  if (!workerProfile) {
    return sendNotFound(res, 'Worker not found');
  }
  
  const user = await User.findById(id);
  
  // Track profile view
  await analyticsService.trackProfileView(id, 'worker');
  
  return sendSuccess(res, {
    user: user?.toJSON(),
    profile: workerProfile,
  });
});

/**
 * Add guarantor for recommended badge
 * POST /api/workers/guarantor
 */
export const addGuarantor = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const guarantorSchema = z.object({
    guarantorName: z.string().min(2),
    guarantorPhone: z.string().min(10),
    guarantorEmail: z.string().email(),
  });
  
  const validation = guarantorSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const workerProfile = await WorkerProfile.findOne({ userId });
  
  if (!workerProfile) {
    return sendNotFound(res, 'Worker profile not found');
  }
  
  if (!workerProfile.recommendedBadge.hasRecommendedBadge) {
    return sendError(res, 'You must pay for the recommended badge first', 400);
  }
  
  workerProfile.recommendedBadge.guarantorName = validation.data.guarantorName;
  workerProfile.recommendedBadge.guarantorPhone = validation.data.guarantorPhone;
  workerProfile.recommendedBadge.guarantorEmail = validation.data.guarantorEmail;
  
  await workerProfile.save();
  
  return sendSuccess(res, workerProfile, 'Guarantor added successfully');
});
