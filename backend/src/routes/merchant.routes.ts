/**
 * Merchant Routes (v2)
 * Marketplace storefront management on Mongo
 */

import { Router } from 'express';
import * as merchantController from '../controllers/merchant.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Authenticated merchant endpoints
router.get('/profile', authenticate, authorize('merchant'), merchantController.getProfile);
router.put('/profile', authenticate, authorize('merchant'), merchantController.updateProfile);
router.post('/subscribe', authenticate, authorize('merchant'), merchantController.subscribe);
router.post('/upload-images', authenticate, authorize('merchant'), merchantController.uploadBusinessImages);
router.delete('/images/:imageIndex', authenticate, authorize('merchant'), merchantController.deleteBusinessImage);
router.get('/subscription', authenticate, authorize('merchant'), merchantController.getSubscription);
router.get('/analytics', authenticate, authorize('merchant'), merchantController.getAnalytics);
router.get('/dashboard', authenticate, authorize('merchant'), merchantController.getDashboardStats);

// Public tracking endpoints
router.post('/:id/track-click', merchantController.trackSocialClick);
router.post('/:id/track-image', merchantController.trackImageClick);

// Public discovery (keep last)
router.get('/', merchantController.getMerchants);
router.get('/:id', merchantController.getMerchantById);

export default router;
