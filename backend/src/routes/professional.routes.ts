/**
 * Professional Routes (v2)
 * Consultation marketplace powered by Mongo
 */

import { Router } from 'express';
import * as professionalController from '../controllers/professional.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Authenticated professional management
router.get('/profile', authenticate, authorize('professional'), professionalController.getProfile);
router.put('/profile', authenticate, authorize('professional'), professionalController.updateProfile);
router.post('/upload-license', authenticate, authorize('professional'), professionalController.uploadLicense);
router.get('/analytics', authenticate, authorize('professional'), professionalController.getAnalytics);
router.get('/dashboard', authenticate, authorize('professional'), professionalController.getDashboardStats);
router.get('/sessions', authenticate, authorize('professional'), professionalController.getMySessions);
router.get('/sessions/:sessionId/messages', authenticate, authorize('professional'), professionalController.getSessionMessages);

// Public booking/review flows
router.post('/:id/book', professionalController.bookConsultation);
router.post('/:id/review', professionalController.submitReview);

// Public discovery (keep after specific segments)
router.get('/', professionalController.getProfessionals);
router.get('/:id', professionalController.getProfessionalById);

export default router;
