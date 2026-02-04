import { Request, Response } from 'express';
import { ConsultationSession } from '../models/ConsultationSession.model';
import { ConsultationClient } from '../models/ConsultationClient.model';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Pricing configuration
const DEFAULT_PRICE_PER_HOUR = 5000; // 5000 kobo = ₦50 per hour (adjust as needed)
const MINIMUM_HOURS = 1;
const MAXIMUM_HOURS = 8; // Optional: limit maximum duration

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: 'success' | 'failed';
    paid_at: string;
    customer: {
      email: string;
    };
  };
}

/**
 * Get professional's pricing
 * GET /api/consultation/pricing/:professionalId
 */
export const getProfessionalPricing = async (req: Request, res: Response) => {
  try {
    const { professionalId } = req.params;

    // TODO: Fetch professional's actual hourly rate from database
    // For now, using default rate
    const pricePerHour = DEFAULT_PRICE_PER_HOUR;

    return res.status(200).json({
      success: true,
      data: {
        professionalId,
        pricePerHour: pricePerHour / 100, // Convert to Naira
        pricePerHourKobo: pricePerHour,
        minimumHours: MINIMUM_HOURS,
        maximumHours: MAXIMUM_HOURS,
        currency: 'NGN',
        availableDurations: [
          { hours: 1, price: (pricePerHour * 1) / 100, priceKobo: pricePerHour * 1 },
          { hours: 2, price: (pricePerHour * 2) / 100, priceKobo: pricePerHour * 2 },
          { hours: 3, price: (pricePerHour * 3) / 100, priceKobo: pricePerHour * 3 },
          { hours: 4, price: (pricePerHour * 4) / 100, priceKobo: pricePerHour * 4 },
        ],
      },
    });
  } catch (error: any) {
    console.error('Error getting pricing:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Initialize payment for consultation session with flexible duration
 * POST /api/consultation/payment/initialize
 */
export const initializeConsultationPayment = async (req: Request, res: Response) => {
  try {
    const { professionalId, clientId, durationHours, email } = req.body;

    // Validation
    if (!professionalId || !clientId || !durationHours) {
      return res.status(400).json({
        success: false,
        message: 'Professional ID, client ID, and duration are required',
      });
    }

    // Validate duration
    if (durationHours < MINIMUM_HOURS) {
      return res.status(400).json({
        success: false,
        message: `Minimum consultation duration is ${MINIMUM_HOURS} hour${MINIMUM_HOURS > 1 ? 's' : ''}`,
      });
    }

    if (MAXIMUM_HOURS && durationHours > MAXIMUM_HOURS) {
      return res.status(400).json({
        success: false,
        message: `Maximum consultation duration is ${MAXIMUM_HOURS} hours`,
      });
    }

    // Get client
    const client = await ConsultationClient.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // TODO: Get professional's actual hourly rate
    const pricePerHour = DEFAULT_PRICE_PER_HOUR;
    const totalAmount = pricePerHour * durationHours;
    const durationMs = durationHours * 3600000; // Convert hours to milliseconds

    // Generate unique reference
    const reference = `CONSULT_${uuidv4()}`;

    // Create session token
    const sessionToken = jwt.sign(
      {
        clientId: client._id,
        username: client.username,
        professionalId,
        type: 'consultation_session',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create consultation session
    const session = new ConsultationSession({
      professionalId,
      clientId: client._id,
      clientUsername: client.username,
      paymentStatus: 'pending',
      paymentAmount: totalAmount,
      paymentReference: reference,
      paymentMethod: 'paystack',
      status: 'pending',
      selectedDuration: durationMs,
      currentDuration: durationMs,
      durationHours,
      pricePerHour,
      minimumDuration: 3600000,
      sessionToken,
      isExtended: false,
      extensionCount: 0,
      extensions: [],
    });

    await session.save();

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email || 'anonymous@consultation.com',
        amount: totalAmount,
        reference,
        metadata: {
          sessionId: session._id.toString(),
          professionalId,
          clientId: client._id.toString(),
          clientUsername: client.username,
          durationHours,
          purpose: 'consultation_session',
        },
        callback_url: `${process.env.FRONTEND_URL}/consultation/verify?reference=${reference}`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.data.status) {
      await session.deleteOne();
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize payment',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        sessionId: session._id,
        authorizationUrl: paystackResponse.data.data.authorization_url,
        reference,
        sessionToken,
        amount: totalAmount / 100, // Convert to Naira
        durationHours,
        clientUsername: client.username,
      },
    });
  } catch (error: any) {
    console.error('Error initializing consultation payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Initialize session extension payment
 * POST /api/consultation/payment/extend
 */
export const initializeSessionExtension = async (req: Request, res: Response) => {
  try {
    const { sessionId, additionalHours, email } = req.body;

    // Validation
    if (!sessionId || !additionalHours) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and additional hours are required',
      });
    }

    if (additionalHours < 1) {
      return res.status(400).json({
        success: false,
        message: 'Extension must be at least 1 hour',
      });
    }

    // Get session
    const session = await ConsultationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if session is active
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active sessions can be extended',
      });
    }

    // Check if session has expired
    if (session.isExpired()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend expired session. Please start a new consultation.',
      });
    }

    // Calculate extension cost
    const extensionCost = session.calculateExtensionCost(additionalHours);
    const reference = `EXTEND_${sessionId}_${uuidv4()}`;

    // Initialize Paystack payment for extension
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email || 'anonymous@consultation.com',
        amount: extensionCost,
        reference,
        metadata: {
          sessionId: session._id.toString(),
          additionalHours,
          purpose: 'session_extension',
          originalReference: session.paymentReference,
        },
        callback_url: `${process.env.FRONTEND_URL}/consultation/session?sessionId=${sessionId}&extended=true`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.data.status) {
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize extension payment',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Extension payment initialized',
      data: {
        authorizationUrl: paystackResponse.data.data.authorization_url,
        reference,
        extensionCost: extensionCost / 100,
        additionalHours,
        currentExpiresAt: session.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error initializing extension payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Verify payment and activate/extend session
 * GET /api/consultation/payment/verify/:reference
 */
export const verifyConsultationPayment = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required',
      });
    }

    // Determine if this is an extension or initial payment
    const isExtension = reference.startsWith('EXTEND_');

    // Find session
    let session;
    if (isExtension) {
      const sessionId = reference.split('_')[1];
      session = await ConsultationSession.findById(sessionId);
    } else {
      session = await ConsultationSession.findOne({ paymentReference: reference });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Verify payment with Paystack
    const verifyResponse = await axios.get<PaystackVerifyResponse>(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!verifyResponse.data.status || verifyResponse.data.data.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    if (isExtension) {
      // Handle extension
      const metadata = verifyResponse.data.data as any;
      const additionalHours = metadata.metadata?.additionalHours || 1;

      session.extendSession(additionalHours, reference);
      await session.save();

      return res.status(200).json({
        success: true,
        message: 'Session extended successfully',
        data: {
          sessionId: session._id,
          sessionToken: session.sessionToken,
          status: session.status,
          expiresAt: session.expiresAt,
          remainingTime: session.getRemainingTime(),
          extensionCount: session.extensionCount,
          totalDurationHours: session.currentDuration / 3600000,
        },
      });
    } else {
      // Handle initial payment
      if (session.paymentStatus === 'completed') {
        return res.status(200).json({
          success: true,
          message: 'Payment already verified',
          data: {
            sessionId: session._id,
            sessionToken: session.sessionToken,
            status: session.status,
            expiresAt: session.expiresAt,
            remainingTime: session.getRemainingTime(),
          },
        });
      }

      // Update session and start
      session.paymentStatus = 'completed';
      session.paidAt = new Date(verifyResponse.data.data.paid_at);
      session.startSession();
      await session.save();

      // Update client statistics
      await ConsultationClient.findByIdAndUpdate(session.clientId, {
        $inc: { totalSessions: 1, activeSessions: 1 },
      });

      return res.status(200).json({
        success: true,
        message: 'Payment verified and session activated',
        data: {
          sessionId: session._id,
          sessionToken: session.sessionToken,
          status: session.status,
          startedAt: session.startedAt,
          expiresAt: session.expiresAt,
          duration: session.currentDuration,
          durationHours: session.durationHours,
          remainingTime: session.getRemainingTime(),
        },
      });
    }
  } catch (error: any) {
    console.error('Error verifying consultation payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get session status
 * GET /api/consultation/payment/session/:sessionId
 */
export const getSessionStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Session token required',
      });
    }

    const session = await ConsultationSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Verify token matches session
    if (session.sessionToken !== sessionToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid session token',
      });
    }

    // Check if expired
    if (session.isExpired() && session.status === 'active') {
      session.status = 'expired';
      await session.save();

      // Update client active sessions
      await ConsultationClient.findByIdAndUpdate(session.clientId, {
        $inc: { activeSessions: -1 },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        paymentStatus: session.paymentStatus,
        professionalId: session.professionalId,
        clientUsername: session.clientUsername,
        durationHours: session.durationHours,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        remainingTime: session.getRemainingTime(),
        isActive: session.isActive(),
        messageCount: session.messageCount,
        isExtended: session.isExtended,
        extensionCount: session.extensionCount,
        pricePerHour: session.pricePerHour / 100,
      },
    });
  } catch (error: any) {
    console.error('Error getting session status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};