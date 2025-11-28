/**
 * Payment Routes (v2)
 * Paystack-backed transactions via Mongo models
 */

import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Initialization endpoints
router.post(
  '/worker/subscription',
  authenticate,
  authorize('worker'),
  paymentController.initializeWorkerSubscription
);
router.post(
  '/worker/recommended-badge',
  authenticate,
  authorize('worker'),
  paymentController.initializeRecommendedBadge
);
router.post('/consultation', paymentController.initializeConsultation);
router.post(
  '/merchant/package',
  authenticate,
  authorize('merchant'),
  paymentController.initializeMerchantPackage
);
router.post(
  '/job-post',
  authenticate,
  paymentController.initializeJobPost
);

// Verification & webhook
router.get('/verify/:reference', authenticate, paymentController.verifyPayment);
router.post('/webhook', paymentController.paystackWebhook);

// Authenticated payment history/statistics
router.get('/history', authenticate, paymentController.getPaymentHistory);
router.get('/stats', authenticate, paymentController.getPaymentStats);
router.get('/dashboard/summary', authenticate, paymentController.getDashboardSummary);
router.get('/reference/:reference', authenticate, paymentController.getPaymentByReference);
router.get('/:id', authenticate, paymentController.getPaymentById);
router.post('/:id/refund', authenticate, paymentController.refundPayment);

export default router;
