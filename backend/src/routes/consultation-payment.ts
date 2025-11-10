import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { initializePayment, verifyPayment } from '../services/paystack.ts';
import {
  generateAnonymousId,
  generateClientSessionToken,
  generatePaymentReference
} from '../utils/consultationUtils.ts';
import { ConsultationSession } from '../models/ConsultationSession.ts';
import { Professional } from '../models/Professional.ts';
import { Message } from '../models/Message.ts';

const router = Router();

// Constants
const CONSULTATION_FEE = 300000; // ₦3,000 in kobo
const PROFESSIONAL_EARNING = 250000; // ₦2,500 in kobo
const PLATFORM_FEE = 50000; // ₦500 in kobo

/**
 * POST /api/consultation/payment/initialize
 * Initialize payment for a consultation session
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const { professionalId, clientEmail } = req.body;

    // Validation
    if (!professionalId) {
      return res.status(400).json({
        success: false,
        message: 'Professional ID is required'
      });
    }

    if (!clientEmail || !isValidEmail(clientEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Valid client email is required'
      });
    }

    // Validate professionalId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(professionalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid professional ID format'
      });
    }

    // Check if professional exists and is active
    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Professional not found'
      });
    }

    if (!professional.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Professional is not currently accepting consultations'
      });
    }

    // Generate payment reference
    const paymentReference = generatePaymentReference();

    // Initialize Paystack payment
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/consultation/verify?reference=${paymentReference}`;

    const paymentData = await initializePayment({
      email: clientEmail,
      amount: CONSULTATION_FEE,
      reference: paymentReference,
      callback_url: callbackUrl,
      metadata: {
        professionalId: professionalId,
        professionalName: `${professional.firstName} ${professional.lastName}`,
        profession: professional.profession,
        type: 'consultation_payment'
      }
    });

    // Return payment URL
    return res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        paymentUrl: paymentData.data.authorization_url,
        reference: paymentReference,
        amount: CONSULTATION_FEE,
        professionalName: `${professional.firstName} ${professional.lastName}`,
        profession: professional.profession
      }
    });

  } catch (error) {
    console.error('[consultation-payment] Initialize payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/consultation/payment/verify?reference=xxx
 * Verify payment and create consultation session
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const { reference } = req.query;

    // Validation
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    // Check if session already exists for this payment reference
    const existingSession = await ConsultationSession.findOne({ paymentReference: reference });
    if (existingSession) {
      return res.status(200).json({
        success: true,
        message: 'Session already created',
        data: {
          sessionId: existingSession._id.toString(),
          sessionToken: existingSession.clientSessionToken,
          professionalId: existingSession.professionalId.toString(),
          status: existingSession.status,
          endsAt: existingSession.endsAt,
          clientAnonymousId: existingSession.clientAnonymousId
        }
      });
    }

    // Verify payment with Paystack
    const paymentVerification = await verifyPayment(reference);

    if (!paymentVerification.data || paymentVerification.data.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        paymentStatus: paymentVerification.data?.status
      });
    }

    // Validate payment amount
    if (paymentVerification.data.amount !== CONSULTATION_FEE) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount'
      });
    }

    // Extract professional ID from metadata
    const metadata = paymentVerification.data.metadata || {};
    const professionalId = metadata.professionalId;

    if (!professionalId || !mongoose.Types.ObjectId.isValid(professionalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment metadata'
      });
    }

    // Verify professional still exists and is active
    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Professional not found'
      });
    }

    if (!professional.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Professional is no longer accepting consultations'
      });
    }

    // Generate client anonymous ID and session token
    const clientAnonymousId = generateAnonymousId();

    // Create consultation session
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const session = new ConsultationSession({
      professionalId: new mongoose.Types.ObjectId(professionalId),
      clientAnonymousId,
      clientSessionToken: '', // Will be set after session is created
      paymentReference: reference,
      amountPaid: CONSULTATION_FEE,
      professionalEarning: PROFESSIONAL_EARNING,
      platformFee: PLATFORM_FEE,
      status: 'active',
      startedAt,
      endsAt,
      endedAt: null,
      endedBy: null,
      hasUnreadMessages: false,
      lastMessageAt: null
    });

    await session.save();

    // Generate session token with the actual session ID
    const sessionToken = generateClientSessionToken(session._id.toString(), clientAnonymousId);
    session.clientSessionToken = sessionToken;
    await session.save();

    // Create initial system message
    const welcomeMessage = new Message({
      sessionId: session._id,
      senderId: 'system',
      senderType: 'client',
      content: `Consultation session started with ${professional.firstName} ${professional.lastName}. This session will end automatically in 24 hours.`,
      messageType: 'system',
      isRead: false
    });
    await welcomeMessage.save();

    // Update professional statistics
    professional.totalSessions += 1;
    await professional.save();

    // Return session details
    return res.status(201).json({
      success: true,
      message: 'Payment verified and session created successfully',
      data: {
        sessionId: session._id.toString(),
        sessionToken: sessionToken,
        professionalId: professionalId,
        professionalName: `${professional.firstName} ${professional.lastName}`,
        profession: professional.profession,
        specialization: professional.specialization,
        status: session.status,
        startedAt: session.startedAt,
        endsAt: session.endsAt,
        clientAnonymousId: clientAnonymousId
      }
    });

  } catch (error) {
    console.error('[consultation-payment] Verify payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment and create session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper function to validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default router;
