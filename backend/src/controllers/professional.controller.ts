/**
 * Professional Controller
 * Handle all professional (Doctor/Lawyer) related requests
 */

import { Response } from 'express';
import { z } from 'zod';
import { ProfessionalProfile } from '../models/ProfessionalProfile.model';
import { User } from '../models/User.model';
import { ConsultationSession } from '../models/ConsultationSession.model';
import { Review } from '../models/Review.model';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import * as analyticsService from '../services/analytics.service';
import * as paymentService from '../services/payment.service';
import { sendConsultationSessionEmail } from '../services/email.service';

/**
 * Get professional profile
 * GET /api/professionals/profile
 */
export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const user = await User.findById(userId);
  const professionalProfile = await ProfessionalProfile.findOne({ userId });
  
  if (!user || !professionalProfile) {
    return sendNotFound(res, 'Professional profile not found');
  }
  
  return sendSuccess(res, {
    user: user.toJSON(),
    profile: professionalProfile,
  });
});

/**
 * Update professional profile
 * PUT /api/professionals/profile
 */
export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const updateSchema = z.object({
    specialization: z.string().optional(),
    yearsOfExperience: z.number().min(0).max(70).optional(),
    profilePhoto: z.string().url().optional(),
    bio: z.string().max(1000).optional(),
  });
  
  const validation = updateSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const professionalProfile = await ProfessionalProfile.findOne({ userId });
  
  if (!professionalProfile) {
    return sendNotFound(res, 'Professional profile not found');
  }
  
  // Update fields (note: licenseNumber cannot be changed)
  Object.assign(professionalProfile, validation.data);
  await professionalProfile.save();
  
  return sendSuccess(res, professionalProfile, 'Profile updated successfully');
});

/**
 * Upload license document
 * POST /api/professionals/upload-license
 */
export const uploadLicense = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const licenseSchema = z.object({
    professionalType: z.enum(['doctor', 'lawyer']),
    licenseNumber: z.string().min(4),
    licenseDocumentUrl: z.string().url(),
    specialization: z.string().optional(),
  });
  
  const validation = licenseSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  // Check if professional profile already exists
  let professionalProfile = await ProfessionalProfile.findOne({ userId });
  
  if (professionalProfile) {
    return sendError(res, 'Professional profile already exists', 400);
  }
  
  // Create professional profile
  professionalProfile = await ProfessionalProfile.create({
    userId,
    professionalType: validation.data.professionalType,
    licenseNumber: validation.data.licenseNumber,
    specialization: validation.data.specialization,
    isVerified: false, // Admin will verify manually
  });
  
  return sendSuccess(res, professionalProfile, 'License uploaded successfully. Awaiting verification.');
});

/**
 * Get professional analytics
 * GET /api/professionals/analytics
 */
export const getAnalytics = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const analytics = await analyticsService.getProfessionalAnalytics(userId);
  
  return sendSuccess(res, analytics);
});

/**
 * Get all professionals (public endpoint)
 * GET /api/professionals
 */
export const getProfessionals = asyncHandler(async (req: any, res: Response) => {
  const { page = 1, limit = 20, professionalType, specialization, minRating } = req.query;
  
  const query: any = { isVerified: true };
  
  // Filter by professional type
  if (professionalType) {
    query.professionalType = professionalType;
  }
  
  // Filter by specialization
  if (specialization) {
    query.specialization = { $regex: specialization, $options: 'i' };
  }
  
  // Filter by minimum rating
  if (minRating) {
    query.rating = { $gte: Number(minRating) };
  }
  
  const professionals = await ProfessionalProfile.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ rating: -1, createdAt: -1 });
  
  const total = await ProfessionalProfile.countDocuments(query);
  
  // Get user details for each professional
  const professionalsWithUsers = await Promise.all(
    professionals.map(async (professional) => {
      const user = await User.findById(professional.userId);
      const reviewCount = await Review.countDocuments({ professionalId: professional.userId });
      
      return {
        ...professional.toJSON(),
        user: user?.toJSON(),
        reviewCount,
      };
    })
  );
  
  return sendSuccess(res, {
    professionals: professionalsWithUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Get single professional by ID (public endpoint)
 * GET /api/professionals/:id
 */
export const getProfessionalById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  
  const professionalProfile = await ProfessionalProfile.findOne({ userId: id });
  
  if (!professionalProfile) {
    return sendNotFound(res, 'Professional not found');
  }
  
  const user = await User.findById(id);
  
  // Track profile view
  await analyticsService.trackProfileView(id, 'professional');
  
  // Get reviews
  const reviews = await Review.find({ professionalId: id })
    .sort({ createdAt: -1 })
    .limit(10);
  
  return sendSuccess(res, {
    user: user?.toJSON(),
    profile: professionalProfile,
    reviews,
  });
});

/**
 * Book consultation (client endpoint - no auth required)
 * POST /api/professionals/:id/book
 */
export const bookConsultation = asyncHandler(async (req: any, res: Response) => {
  const { id: professionalId } = req.params;
  
  const bookingSchema = z.object({
    clientName: z.string().min(2),
    clientEmail: z.string().email(),
    paystackReference: z.string().min(1), // Payment must be completed first
  });
  
  const validation = bookingSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  // Verify professional exists and is verified
  const professionalProfile = await ProfessionalProfile.findOne({ userId: professionalId });
  
  if (!professionalProfile) {
    return sendNotFound(res, 'Professional not found');
  }
  
  if (!professionalProfile.isVerified) {
    return sendError(res, 'This professional is not yet verified', 400);
  }
  
  // Verify payment was completed
  const payment = await paymentService.verifyAndProcessPayment(validation.data.paystackReference);
  
  if (!payment) {
    return sendError(res, 'Payment verification failed', 400);
  }
  
  // Get the created session from payment processing
  const session = await ConsultationSession.findOne({ 
    paymentId: payment._id!.toString() 
  });
  
  if (!session) {
    return sendError(res, 'Failed to create consultation session', 500);
  }
  
  // Track consultation unlock
  await analyticsService.trackConsultationUnlock(professionalId);
  
  // Send session details to client via email
  const user = await User.findById(professionalId);
  await sendConsultationSessionEmail(
    validation.data.clientEmail,
    session.sessionToken,
    user?.name || 'Professional'
  );
  
  return sendSuccess(res, {
    session: {
      sessionToken: session.sessionToken,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
    },
    message: 'Consultation booked successfully. Check your email for session details.',
  });
});

/**
 * Get professional's active sessions
 * GET /api/professionals/sessions
 */
export const getMySessions = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { status = 'active' } = req.query;
  
  const sessions = await ConsultationSession.find({
    professionalId: userId,
    status,
  }).sort({ createdAt: -1 });
  
  return sendSuccess(res, { sessions });
});

/**
 * Get session messages
 * GET /api/professionals/sessions/:sessionId/messages
 */
export const getSessionMessages = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { sessionId } = req.params;
  
  const session = await ConsultationSession.findById(sessionId);
  
  if (!session) {
    return sendNotFound(res, 'Session not found');
  }
  
  // Verify this professional owns the session
  if (session.professionalId !== userId) {
    return sendError(res, 'You do not have permission to view this session', 403);
  }
  
  return sendSuccess(res, {
    messages: session.messages || [],
  });
});

/**
 * Submit review for professional (client endpoint - no auth required)
 * POST /api/professionals/:id/review
 */
export const submitReview = asyncHandler(async (req: any, res: Response) => {
  const { id: professionalId } = req.params;
  
  const reviewSchema = z.object({
    sessionId: z.string().min(1),
    sessionToken: z.string().min(1),
    clientName: z.string().min(2),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  });
  
  const validation = reviewSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  // Verify session exists and belongs to this professional
  const session = await ConsultationSession.findOne({
    _id: validation.data.sessionId,
    sessionToken: validation.data.sessionToken,
    professionalId,
  });
  
  if (!session) {
    return sendError(res, 'Invalid session', 400);
  }
  
  // Check if session is expired (reviews only for expired sessions)
  if (session.status !== 'expired') {
    return sendError(res, 'You can only review after the session has ended', 400);
  }
  
  // Check if review already exists for this session
  const existingReview = await Review.findOne({ sessionId: validation.data.sessionId });
  
  if (existingReview) {
    return sendError(res, 'You have already reviewed this session', 400);
  }
  
  // Create review
  const review = await Review.create({
    professionalId,
    sessionId: validation.data.sessionId,
    clientName: validation.data.clientName,
    rating: validation.data.rating,
    comment: validation.data.comment,
  });
  
  // Update professional's average rating
  const professionalProfile = await ProfessionalProfile.findOne({ userId: professionalId });
  
  if (professionalProfile) {
    await professionalProfile.updateRating(validation.data.rating);
  }
  
  return sendSuccess(res, review, 'Review submitted successfully');
});

/**
 * Get professional dashboard stats
 * GET /api/professionals/dashboard
 */
export const getDashboardStats = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const totalSessions = await ConsultationSession.countDocuments({ professionalId: userId });
  const activeSessions = await ConsultationSession.countDocuments({ 
    professionalId: userId,
    status: 'active' 
  });
  const expiredSessions = await ConsultationSession.countDocuments({ 
    professionalId: userId,
    status: 'expired' 
  });
  
  const professionalProfile = await ProfessionalProfile.findOne({ userId });
  const totalReviews = await Review.countDocuments({ professionalId: userId });
  
  return sendSuccess(res, {
    sessions: {
      total: totalSessions,
      active: activeSessions,
      expired: expiredSessions,
    },
    earnings: professionalProfile?.totalEarnings || 0,
    rating: professionalProfile?.rating || 0,
    totalReviews,
  });
});
