/**
 * Job Routes (v2)
 * Mongo-backed job board endpoints
 */

import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public listings
router.get('/', jobController.getAllJobs);
router.get('/employer/:employerId', jobController.getJobsByEmployer);

// Authenticated worker flows
router.get('/my-applications', authenticate, authorize('worker'), jobController.getMyApplications);
router.get('/applications/:applicationId', authenticate, jobController.getApplicationById);
router.delete('/applications/:applicationId', authenticate, authorize('worker'), jobController.withdrawApplication);

// Get applicants for a job (job poster only)
router.get('/applications/job/:jobId', authenticate, jobController.getJobApplicants);

// Job CRUD (all user types can post jobs)
router.post('/', authenticate, jobController.createJob);
router.put('/:id', authenticate, jobController.updateJob);
router.delete('/:id', authenticate, jobController.deleteJob);

// Worker applications
router.post('/:id/apply', authenticate, authorize('worker'), jobController.applyToJob);

// Public job detail (keep last to avoid conflicts)
router.get('/:id', jobController.getJobById);

export default router;
