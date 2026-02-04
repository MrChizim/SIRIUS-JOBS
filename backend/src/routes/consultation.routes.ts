import { Router } from 'express';

// Client Authentication
import {
  registerConsultationClient,
  loginConsultationClient,
  getConsultationClientProfile,
  updateConsultationClientProfile,
  checkUsernameAvailability,
} from '../controllers/consultation-client-auth.controller';

// Payment & Sessions
import {
  getProfessionalPricing,
  initializeConsultationPayment,
  initializeSessionExtension,
  verifyConsultationPayment,
  getSessionStatus,
} from '../controllers/consultation-payment-enhanced.controller';

const router = Router();

// ==========================================
// CONSULTATION CLIENT AUTHENTICATION ROUTES
// ==========================================

/**
 * Register new consultation client (anonymous account)
 * POST /api/consultation/auth/register
 * Body: { username, password, email?, displayName? }
 */
router.post('/auth/register', registerConsultationClient);

/**
 * Login consultation client
 * POST /api/consultation/auth/login
 * Body: { username, password }
 */
router.post('/auth/login', loginConsultationClient);

/**
 * Get client profile
 * GET /api/consultation/auth/profile
 * Headers: Authorization: Bearer <token>
 */
router.get('/auth/profile', getConsultationClientProfile);

/**
 * Update client profile
 * PUT /api/consultation/auth/profile
 * Headers: Authorization: Bearer <token>
 * Body: { displayName?, email?, avatar? }
 */
router.put('/auth/profile', updateConsultationClientProfile);

/**
 * Check username availability
 * GET /api/consultation/auth/check-username/:username
 */
router.get('/auth/check-username/:username', checkUsernameAvailability);

// ==========================================
// CONSULTATION PAYMENT & SESSION ROUTES
// ==========================================

/**
 * Get professional's pricing
 * GET /api/consultation/pricing/:professionalId
 */
router.get('/pricing/:professionalId', getProfessionalPricing);

/**
 * Initialize payment for consultation session
 * POST /api/consultation/payment/initialize
 * Body: { professionalId, clientId, durationHours, email? }
 */
router.post('/payment/initialize', initializeConsultationPayment);

/**
 * Initialize session extension payment
 * POST /api/consultation/payment/extend
 * Body: { sessionId, additionalHours, email? }
 */
router.post('/payment/extend', initializeSessionExtension);

/**
 * Verify payment and activate/extend session
 * GET /api/consultation/payment/verify/:reference
 */
router.get('/payment/verify/:reference', verifyConsultationPayment);

/**
 * Get session status
 * GET /api/consultation/payment/session/:sessionId
 * Headers: Authorization: Bearer <sessionToken>
 */
router.get('/payment/session/:sessionId', getSessionStatus);

export default router;