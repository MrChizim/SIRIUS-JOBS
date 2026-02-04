/**
 * Worker Routes
 * Handles worker/artisan profile and operations
 */

import { Router } from 'express';
import * as workerController from '../controllers/worker.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/workers
 * @desc    Get all workers (public)
 * @access  Public
 */
router.get('/', workerController.getAllWorkers);

/**
 * @route   GET /api/workers/:id
 * @desc    Get worker by ID (public)
 * @access  Public
 */
router.get('/:id', workerController.getWorkerById);

/**
 * @route   GET /api/workers/profile
 * @desc    Get own worker profile
 * @access  Private (Worker)
 */
router.get('/profile', authenticate, workerController.getProfile);

/**
 * @route   PUT /api/workers/profile
 * @desc    Update worker profile
 * @access  Private (Worker)
 */
router.put('/profile', authenticate, workerController.updateProfile);

/**
 * @route   POST /api/workers/upload-id
 * @desc    Upload government ID
 * @access  Private (Worker)
 */
router.post('/upload-id', authenticate, workerController.uploadGovernmentId);

/**
 * @route   POST /api/workers/upload-photo
 * @desc    Upload profile photo
 * @access  Private (Worker)
 */
router.post('/upload-photo', authenticate, workerController.uploadProfilePhoto);

/**
 * @route   GET /api/workers/subscription
 * @desc    Get subscription details
 * @access  Private (Worker)
 */
router.get('/subscription', authenticate, workerController.getSubscription);

/**
 * @route   GET /api/workers/can-appear-publicly
 * @desc    Check if worker can appear publicly
 * @access  Private (Worker)
 */
router.get('/can-appear-publicly', authenticate, workerController.canAppearPublicly);

/**
 * @route   GET /api/workers/analytics
 * @desc    Get worker analytics
 * @access  Private (Worker)
 */
router.get('/analytics', authenticate, workerController.getAnalytics);

/**
 * @route   POST /api/workers/guarantor
 * @desc    Add guarantor for recommended badge
 * @access  Private (Worker)
 */
router.post('/guarantor', authenticate, workerController.addGuarantor);

export default router;
