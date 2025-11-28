/**
 * Payment Controller
 * Handle all payment-related requests and Paystack webhooks
 */

import { Response } from 'express';
import { z } from 'zod';
import { Payment } from '../models/Payment.model';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import * as paymentService from '../services/payment.service';
import crypto from 'crypto';
import { env } from '../config/environment';

/**
 * Initialize worker subscription payment
 * POST /api/payments/worker/subscription
 */
export const initializeWorkerSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const email = req.user!.email;
  
  const paymentData = await paymentService.initializeWorkerSubscription(userId, email);
  
  return sendSuccess(res, paymentData, 'Payment initialized successfully');
});

/**
 * Initialize recommended badge payment
 * POST /api/payments/worker/recommended-badge
 */
export const initializeRecommendedBadge = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const email = req.user!.email;
  
  const guarantorSchema = z.object({
    guarantorName: z.string().min(2),
    guarantorPhone: z.string().min(10),
    guarantorEmail: z.string().email(),
  });
  
  const validation = guarantorSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const paymentData = await paymentService.initializeRecommendedBadge(
    userId,
    email,
    {
      name: validation.data.guarantorName,
      phone: validation.data.guarantorPhone,
      email: validation.data.guarantorEmail,
    }
  );
  
  return sendSuccess(res, paymentData, 'Payment initialized successfully');
});

/**
 * Initialize consultation payment (no auth required - client booking)
 * POST /api/payments/consultation
 */
export const initializeConsultation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const consultationSchema = z.object({
    professionalId: z.string().min(1),
    clientEmail: z.string().email(),
    clientName: z.string().min(2),
  });
  
  const validation = consultationSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const paymentData = await paymentService.initializeConsultation(
    validation.data.professionalId,
    validation.data.clientEmail,
    validation.data.clientName
  );
  
  return sendSuccess(res, paymentData, 'Payment initialized successfully');
});

/**
 * Initialize merchant package payment
 * POST /api/payments/merchant/package
 */
export const initializeMerchantPackage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const email = req.user!.email;
  
  const packageSchema = z.object({
    packageType: z.enum(['3months', '6months', '12months']),
  });
  
  const validation = packageSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const paymentData = await paymentService.initializeMerchantPackage(
    userId,
    email,
    validation.data.packageType
  );
  
  return sendSuccess(res, paymentData, 'Payment initialized successfully');
});

/**
 * Initialize job post payment (all user types)
 * POST /api/payments/job-post
 */
export const initializeJobPost = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const email = req.user!.email;
  const accountType = req.user!.accountType;

  const paymentData = await paymentService.initializeJobPost(userId, email, accountType);

  return sendSuccess(res, paymentData, 'Job post payment initialized successfully');
});

/**
 * Verify payment
 * GET /api/payments/verify/:reference
 */
export const verifyPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { reference } = req.params;
  
  if (!reference) {
    return sendError(res, 'Payment reference is required', 400);
  }
  
  try {
    const payment = await paymentService.verifyAndProcessPayment(reference);
    
    return sendSuccess(res, payment, 'Payment verified and processed successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Payment verification failed', 400);
  }
});

/**
 * Paystack webhook handler
 * POST /api/payments/webhook
 * 
 * IMPORTANT: This endpoint receives payment notifications from Paystack
 * It must be publicly accessible (no auth middleware)
 */
export const paystackWebhook = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Verify webhook signature
  const signature = req.headers['x-paystack-signature'] as string;
  
  if (!signature) {
    return sendError(res, 'No signature provided', 400);
  }
  
  // Compute HMAC signature
  const hash = crypto
    .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (hash !== signature) {
    return sendError(res, 'Invalid signature', 400);
  }
  
  // Process webhook event
  const event = req.body;
  
  console.log('📨 Paystack webhook received:', event.event);
  
  try {
    switch (event.event) {
      case 'charge.success':
        // Payment successful
        const reference = event.data.reference;
        await paymentService.verifyAndProcessPayment(reference);
        console.log('✅ Payment processed successfully:', reference);
        break;
        
      case 'charge.failed':
        // Payment failed
        console.log('❌ Payment failed:', event.data.reference);
        // You can update payment status to 'failed' here if needed
        break;
        
      default:
        console.log('ℹ️  Unhandled webhook event:', event.event);
    }
    
    // Always respond with 200 to acknowledge receipt
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // Still respond with 200 to prevent Paystack from retrying
    return res.status(200).json({ success: true, error: error.message });
  }
});

/**
 * Get payment history for authenticated user
 * GET /api/payments/history
 */
export const getPaymentHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { page = 1, limit = 20, status, paymentType } = req.query;
  
  const query: any = { userId };
  
  if (status) {
    query.status = status;
  }
  
  if (paymentType) {
    query.paymentType = paymentType;
  }
  
  const payments = await Payment.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });
  
  const total = await Payment.countDocuments(query);
  
  return sendSuccess(res, {
    payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Get single payment by ID
 * GET /api/payments/:id
 */
export const getPaymentById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  
  const payment = await Payment.findById(id);
  
  if (!payment) {
    return sendNotFound(res, 'Payment not found');
  }
  
  // Verify ownership
  if (payment.userId !== userId) {
    return sendError(res, 'You do not have permission to view this payment', 403);
  }
  
  return sendSuccess(res, payment);
});

/**
 * Get payment by reference
 * GET /api/payments/reference/:reference
 */
export const getPaymentByReference = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { reference } = req.params;
  
  const payment = await Payment.findOne({ paystackReference: reference });
  
  if (!payment) {
    return sendNotFound(res, 'Payment not found');
  }
  
  // Verify ownership
  if (payment.userId !== userId) {
    return sendError(res, 'You do not have permission to view this payment', 403);
  }
  
  return sendSuccess(res, payment);
});

/**
 * Get payment statistics for user
 * GET /api/payments/stats
 */
export const getPaymentStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  
  const totalPayments = await Payment.countDocuments({ userId });
  const completedPayments = await Payment.countDocuments({ userId, status: 'completed' });
  const pendingPayments = await Payment.countDocuments({ userId, status: 'pending' });
  const failedPayments = await Payment.countDocuments({ userId, status: 'failed' });
  
  // Calculate total amount spent
  const completedPaymentDocs = await Payment.find({ userId, status: 'completed' });
  const totalAmountSpent = completedPaymentDocs.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Get payment breakdown by type
  const paymentsByType = await Payment.aggregate([
    { $match: { userId, status: 'completed' } },
    {
      $group: {
        _id: '$paymentType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);
  
  return sendSuccess(res, {
    summary: {
      total: totalPayments,
      completed: completedPayments,
      pending: pendingPayments,
      failed: failedPayments,
      totalAmountSpent,
    },
    byType: paymentsByType,
  });
});

/**
 * Refund payment (admin only - placeholder)
 * POST /api/payments/:id/refund
 * 
 * NOTE: This would require admin authentication middleware
 * Currently a placeholder for future implementation
 */
export const refundPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  const payment = await Payment.findById(id);
  
  if (!payment) {
    return sendNotFound(res, 'Payment not found');
  }
  
  if (payment.status !== 'completed') {
    return sendError(res, 'Only completed payments can be refunded', 400);
  }
  
  // TODO: Implement actual refund logic with Paystack API
  // For now, just update status
  await payment.refund();
  
  return sendSuccess(res, payment, 'Payment refunded successfully');
});

/**
 * Get payment summary for dashboard
 * GET /api/payments/dashboard/summary
 */
export const getDashboardSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const accountType = req.user!.accountType;
  
  // Get recent payments
  const recentPayments = await Payment.find({ userId })
    .sort({ createdAt: -1 })
    .limit(5);
  
  // Get total spent
  const completedPayments = await Payment.find({ userId, status: 'completed' });
  const totalSpent = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Get pending payments
  const pendingCount = await Payment.countDocuments({ userId, status: 'pending' });
  
  // Get last payment date
  const lastPayment = await Payment.findOne({ userId, status: 'completed' })
    .sort({ createdAt: -1 });
  
  return sendSuccess(res, {
    accountType,
    totalSpent,
    pendingPayments: pendingCount,
    lastPaymentDate: lastPayment?.createdAt,
    recentPayments,
  });
});
