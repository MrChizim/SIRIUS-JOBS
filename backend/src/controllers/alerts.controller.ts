/**
 * Alerts Controller
 * Manage job alert subscriptions and notifications
 */

import { Response } from 'express';
import { z } from 'zod';
import { AlertSubscription } from '../models/AlertSubscription.model';
import { Notification } from '../models/Notification.model';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

const subscriptionSchema = z.object({
  skill: z.string().min(2),
  location: z.string().optional(),
});

/**
 * Subscribe to a job alert
 * POST /api/v2/alerts/subscriptions
 */
export const subscribe = asyncHandler(async (req: any, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  const validation = subscriptionSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }

  const subscription = await AlertSubscription.findOneAndUpdate(
    {
      userId: req.user.userId,
      skill: validation.data.skill.toLowerCase(),
      location: validation.data.location ?? null,
    },
    {
      $set: {
        alertType: 'JOB_MATCH',
        active: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return sendSuccess(res, subscription, 'Alert subscription updated');
});

/**
 * Get current user subscriptions
 * GET /api/v2/alerts/subscriptions
 */
export const getSubscriptions = asyncHandler(async (req: any, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  const subscriptions = await AlertSubscription.find({ userId: req.user.userId }).sort({ createdAt: -1 });
  return sendSuccess(res, subscriptions);
});

/**
 * Delete subscription
 * DELETE /api/v2/alerts/subscriptions/:id
 */
export const deleteSubscription = asyncHandler(async (req: any, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  const { id } = req.params;
  const subscription = await AlertSubscription.findOne({ _id: id, userId: req.user.userId });

  if (!subscription) {
    return sendNotFound(res, 'Subscription not found');
  }

  await subscription.deleteOne();
  return sendSuccess(res, null, 'Subscription removed');
});

/**
 * Get notifications for current user
 * GET /api/v2/alerts/notifications
 */
export const getNotifications = asyncHandler(async (req: any, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  const notifications = await Notification.find({ userId: req.user.userId })
    .sort({ createdAt: -1 })
    .limit(50);

  return sendSuccess(res, notifications);
});

/**
 * Mark notification read
 * PATCH /api/v2/alerts/notifications/:id/read
 */
export const markNotificationRead = asyncHandler(async (req: any, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  const { id } = req.params;
  const notification = await Notification.findOne({ _id: id, userId: req.user.userId });

  if (!notification) {
    return sendNotFound(res, 'Notification not found');
  }

  notification.read = true;
  await notification.save();

  return sendSuccess(res, notification, 'Notification marked as read');
});
