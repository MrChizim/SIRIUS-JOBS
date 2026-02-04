/**
 * Employer Routes (v2)
 * Mongo-backed employer/account management
 */

import { Router } from 'express';
import * as employerController from '../controllers/employer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Authenticated employer endpoints
router.get('/profile', authenticate, authorize('employer'), employerController.getProfile);
router.put('/profile', authenticate, authorize('employer'), employerController.updateProfile);
router.get('/analytics', authenticate, authorize('employer'), employerController.getAnalytics);
router.get('/dashboard', authenticate, authorize('employer'), employerController.getDashboardStats);
router.get('/jobs', authenticate, authorize('employer'), employerController.getMyJobs);
router.get('/jobs/:jobId/applicants', authenticate, authorize('employer'), employerController.getJobApplicants);
router.post('/applications/:applicationId/accept', authenticate, authorize('employer'), employerController.acceptApplication);
router.post('/applications/:applicationId/reject', authenticate, authorize('employer'), employerController.rejectApplication);

// Public endpoints (keep last to prevent conflicts)
router.get('/', employerController.getAllEmployers);
router.get('/:id', employerController.getEmployerById);

export default router;
