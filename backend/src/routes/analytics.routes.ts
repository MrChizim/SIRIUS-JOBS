/**
 * Analytics Routes
 * Handles analytics tracking and retrieval
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as analyticsService from '../services/analytics.service';
import { sendSuccess } from '../utils/response.util';

const router = Router();

/**
 * @route   GET /api/analytics/my-analytics
 * @desc    Get analytics for current user
 * @access  Private
 */
router.get('/my-analytics', authenticate, async (req: any, res) => {
  try {
    const userId = req.user!.userId;
    const accountType = req.user!.accountType;

    let analytics;
    if (accountType === 'worker') {
      analytics = await analyticsService.getWorkerAnalytics(userId);
    } else if (accountType === 'employer') {
      analytics = await analyticsService.getEmployerAnalytics(userId);
    } else if (accountType === 'professional') {
      analytics = await analyticsService.getProfessionalAnalytics(userId);
    } else if (accountType === 'merchant') {
      analytics = await analyticsService.getMerchantAnalytics(userId);
    }

    return sendSuccess(res, analytics);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * @route   POST /api/analytics/track-view
 * @desc    Track profile view
 * @access  Public
 */
router.post('/track-view', async (req, res) => {
  try {
    const { userId, accountType } = req.body;
    await analyticsService.trackProfileView(userId, accountType);
    return sendSuccess(res, null, 'View tracked');
  } catch (error) {
    return res.status(500).json({ error: 'Failed to track view' });
  }
});

export default router;
