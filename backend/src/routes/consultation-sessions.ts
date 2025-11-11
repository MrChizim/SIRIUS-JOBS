import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { verifyClientSessionToken } from '../utils/consultationUtils.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ConsultationSession } from '../models/ConsultationSession.js';
import { Professional } from '../models/Professional.js';
import { Message } from '../models/Message.js';
import { Review } from '../models/Review.js';

const router = Router();

// Type extensions
interface ClientAuthRequest extends Request {
  clientAuth?: {
    sessionId: string;
    clientAnonymousId: string;
  };
}

interface ProfessionalAuthRequest extends AuthenticatedRequest {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

/**
 * Middleware to verify client session token
 */
function verifyClientToken(req: ClientAuthRequest, res: Response, next: Function) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required'
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyClientSessionToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token'
    });
  }

  req.clientAuth = decoded;
  next();
}

/**
 * Middleware to verify either client or professional token
 */
async function verifySessionAccess(req: ClientAuthRequest & ProfessionalAuthRequest, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  const { sessionId } = req.params;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required'
    });
  }

  const token = authHeader.slice(7);

  // Try client token first
  const clientDecoded = verifyClientSessionToken(token);
  if (clientDecoded) {
    // Verify session ID matches
    if (clientDecoded.sessionId !== sessionId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this session'
      });
    }
    req.clientAuth = clientDecoded;
    return next();
  }

  // Try professional token (JWT)
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      sub: string;
      role: string;
      email: string;
    };

    // Verify session belongs to this professional
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID'
      });
    }

    const session = await ConsultationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Find professional by userId
    const professional = await Professional.findOne({ userId: decoded.sub });
    if (!professional) {
      return res.status(403).json({
        success: false,
        message: 'Professional profile not found'
      });
    }

    // Check if session belongs to this professional
    if (session.professionalId.toString() !== professional._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this session'
      });
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
}

/**
 * GET /api/consultation/sessions/:sessionId
 * Get session details
 */
router.get('/:sessionId', verifyClientToken, async (req: ClientAuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Validate session ID
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID'
      });
    }

    // Verify access
    if (req.clientAuth?.sessionId !== sessionId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this session'
      });
    }

    // Get session
    const session = await ConsultationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get professional details
    const professional = await Professional.findById(session.professionalId);
    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Professional not found'
      });
    }

    // Check if session has expired
    const now = new Date();
    if (session.status === 'active' && session.endsAt && now > session.endsAt) {
      session.status = 'expired';
      session.endedAt = session.endsAt;
      session.endedBy = 'auto';
      await session.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        session: {
          id: session._id.toString(),
          status: session.status,
          startedAt: session.startedAt,
          endsAt: session.endsAt,
          endedAt: session.endedAt,
          endedBy: session.endedBy,
          lastMessageAt: session.lastMessageAt
        },
        professional: {
          id: professional._id.toString(),
          firstName: professional.firstName,
          lastName: professional.lastName,
          profession: professional.profession,
          specialization: professional.specialization,
          averageRating: professional.averageRating,
          totalReviews: professional.totalReviews
        }
      }
    });

  } catch (error) {
    console.error('[consultation-sessions] Get session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve session details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/consultation/sessions/:sessionId/messages
 * Send a message in the session
 */
router.post('/:sessionId/messages', verifySessionAccess, async (req: ClientAuthRequest & ProfessionalAuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message content exceeds maximum length of 2000 characters'
      });
    }

    // Get session
    const session = await ConsultationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session is active
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot send messages in ${session.status} session`
      });
    }

    // Check if session has expired
    const now = new Date();
    if (session.endsAt && now > session.endsAt) {
      session.status = 'expired';
      session.endedAt = session.endsAt;
      session.endedBy = 'auto';
      await session.save();

      return res.status(400).json({
        success: false,
        message: 'Session has expired'
      });
    }

    // Determine sender
    let senderId: string;
    let senderType: 'client' | 'professional';

    if (req.clientAuth) {
      senderId = req.clientAuth.clientAnonymousId;
      senderType = 'client';
    } else if (req.user) {
      // Get professional to use their ID
      const professional = await Professional.findOne({ userId: req.user.id });
      if (!professional) {
        return res.status(403).json({
          success: false,
          message: 'Professional profile not found'
        });
      }
      senderId = professional._id.toString();
      senderType = 'professional';
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Create message
    const message = new Message({
      sessionId: new mongoose.Types.ObjectId(sessionId),
      senderId,
      senderType,
      content: content.trim(),
      messageType: 'text',
      isRead: false
    });

    await message.save();

    // Update session
    session.lastMessageAt = new Date();
    if (senderType === 'client') {
      session.hasUnreadMessages = true; // Professional has unread messages
    }
    await session.save();

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: message._id.toString(),
        content: message.content,
        senderId: message.senderId,
        senderType: message.senderType,
        createdAt: message.createdAt
      }
    });

  } catch (error) {
    console.error('[consultation-sessions] Send message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/consultation/sessions/:sessionId/messages
 * Get messages for a session
 */
router.get('/:sessionId/messages', verifySessionAccess, async (req: ClientAuthRequest & ProfessionalAuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, before } = req.query;

    // Get session
    const session = await ConsultationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Build query
    const query: any = { sessionId: new mongoose.Types.ObjectId(sessionId) };

    // Pagination: get messages before a certain message ID
    if (before && typeof before === 'string' && mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Mark messages as read if professional is viewing
    if (req.user && session.hasUnreadMessages) {
      session.hasUnreadMessages = false;
      await session.save();
    }

    // Reverse to show oldest first
    messages.reverse();

    return res.status(200).json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          id: msg._id.toString(),
          content: msg.content,
          senderId: msg.senderId,
          senderType: msg.senderType,
          messageType: msg.messageType,
          createdAt: msg.createdAt
        })),
        hasMore: messages.length === Number(limit)
      }
    });

  } catch (error) {
    console.error('[consultation-sessions] Get messages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/consultation/sessions/:sessionId/end
 * End session early
 */
router.post('/:sessionId/end', verifySessionAccess, async (req: ClientAuthRequest & ProfessionalAuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const session = await ConsultationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session is active
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Session is already ${session.status}`
      });
    }

    // Determine who ended the session
    const endedBy = req.clientAuth ? 'client' : 'professional';

    // Update session
    session.status = 'ended';
    session.endedAt = new Date();
    session.endedBy = endedBy;
    await session.save();

    // Create system message
    const systemMessage = new Message({
      sessionId: session._id,
      senderId: 'system',
      senderType: 'client',
      content: `Session ended by ${endedBy}`,
      messageType: 'system',
      isRead: false
    });
    await systemMessage.save();

    // Update professional earnings
    const professional = await Professional.findById(session.professionalId);
    if (professional) {
      professional.totalEarnings += session.professionalEarning;
      await professional.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Session ended successfully',
      data: {
        sessionId: session._id.toString(),
        status: session.status,
        endedAt: session.endedAt,
        endedBy: session.endedBy
      }
    });

  } catch (error) {
    console.error('[consultation-sessions] End session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to end session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/consultation/sessions/:sessionId/review
 * Submit a review for a completed session
 */
router.post('/:sessionId/review', verifyClientToken, async (req: ClientAuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { rating, reviewText } = req.body;

    // Validate session access
    if (req.clientAuth?.sessionId !== sessionId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this session'
      });
    }

    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Validate review text
    if (!reviewText || typeof reviewText !== 'string' || reviewText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review text is required'
      });
    }

    if (reviewText.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Review text exceeds maximum length of 500 characters'
      });
    }

    // Get session
    const session = await ConsultationSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session has ended
    if (session.status !== 'ended' && session.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed sessions'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ sessionId: new mongoose.Types.ObjectId(sessionId) });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already submitted for this session'
      });
    }

    // Create review
    const review = new Review({
      sessionId: new mongoose.Types.ObjectId(sessionId),
      professionalId: session.professionalId,
      clientAnonymousId: req.clientAuth.clientAnonymousId,
      rating,
      reviewText: reviewText.trim()
    });

    await review.save();

    // Update professional statistics
    const professional = await Professional.findById(session.professionalId);
    if (professional) {
      const totalReviews = professional.totalReviews + 1;
      const newAverage = ((professional.averageRating * professional.totalReviews) + rating) / totalReviews;

      professional.averageRating = Math.round(newAverage * 10) / 10; // Round to 1 decimal
      professional.totalReviews = totalReviews;
      await professional.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        reviewId: review._id.toString(),
        rating: review.rating,
        reviewText: review.reviewText,
        createdAt: review.createdAt
      }
    });

  } catch (error) {
    console.error('[consultation-sessions] Submit review error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/consultation/dashboard/professional
 * Get professional's active and past sessions
 */
router.get('/dashboard/professional', requireAuth(['DOCTOR', 'LAWYER']), async (req: ProfessionalAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get professional profile
    const professional = await Professional.findOne({ userId: req.user.id });
    if (!professional) {
      return res.status(404).json({
        success: false,
        message: 'Professional profile not found'
      });
    }

    const { status, limit = 20, offset = 0 } = req.query;

    // Build query
    const query: any = { professionalId: professional._id };

    if (status && typeof status === 'string') {
      if (['pending', 'active', 'ended', 'expired'].includes(status)) {
        query.status = status;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid status filter'
        });
      }
    }

    // Get sessions
    const sessions = await ConsultationSession.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean();

    // Get total count
    const totalCount = await ConsultationSession.countDocuments(query);

    // Get reviews for ended sessions
    const sessionIds = sessions.map(s => s._id);
    const reviews = await Review.find({ sessionId: { $in: sessionIds } }).lean();
    const reviewMap = new Map(reviews.map(r => [r.sessionId.toString(), r]));

    // Format response
    const formattedSessions = sessions.map(session => {
      const review = reviewMap.get(session._id.toString());

      return {
        id: session._id.toString(),
        clientAnonymousId: session.clientAnonymousId,
        status: session.status,
        amountPaid: session.amountPaid,
        professionalEarning: session.professionalEarning,
        startedAt: session.startedAt,
        endsAt: session.endsAt,
        endedAt: session.endedAt,
        endedBy: session.endedBy,
        hasUnreadMessages: session.hasUnreadMessages,
        lastMessageAt: session.lastMessageAt,
        createdAt: session.createdAt,
        review: review ? {
          rating: review.rating,
          reviewText: review.reviewText,
          createdAt: review.createdAt
        } : null
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: {
          total: totalCount,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + sessions.length < totalCount
        },
        statistics: {
          totalSessions: professional.totalSessions,
          totalEarnings: professional.totalEarnings,
          averageRating: professional.averageRating,
          totalReviews: professional.totalReviews
        }
      }
    });

  } catch (error) {
    console.error('[consultation-sessions] Professional dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve professional sessions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
