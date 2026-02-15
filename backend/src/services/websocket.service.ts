/**
 * WebSocket Service
 * Handle real-time communication for consultations using Socket.IO
 */

import { Server as SocketIOServer } from 'socket.io';
import { ConsultationSession } from '../models/ConsultationSession.model';
import { verifyAccessToken } from '../utils/jwt.util';

/**
 * Initialize Socket.IO server
 * @param io - Socket.IO server instance
 */
export const initializeWebSocket = (io: SocketIOServer) => {
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    /**
     * Join consultation room
     * Client must provide sessionToken
     */
    socket.on('join:consultation', async (data: { sessionToken: string }) => {
      try {
        const { sessionToken } = data;
        
        // Verify session exists
        const session = await ConsultationSession.findOne({ sessionToken });
        
        if (!session) {
          socket.emit('error', { message: 'Invalid session token' });
          return;
        }
        
        // Check if session is active
        if (session.expiresAt && new Date() > session.expiresAt) {
          socket.emit('error', { message: 'Session has expired' });
          return;
        }
        
        // Activate session if pending
        if (session.status === 'pending') {
          session.status = 'active'; session.startedAt = new Date(); session.expiresAt = new Date(Date.now() + session.currentDuration); await session.save();
        }
        
        // Join the consultation room
        socket.join(`consultation:${session._id}`);
        
        socket.emit('joined:consultation', {
          sessionId: session._id,
          professionalId: session.professionalId,
          endsAt: session.endsAt,
        });
        
        console.log(`✅ Client joined consultation: ${session._id}`);
      } catch (error: any) {
        console.error('Error joining consultation:', error);
        socket.emit('error', { message: error.message });
      }
    });
    
    /**
     * Send message in consultation
     */
    socket.on('message:send', async (data: {
      sessionToken: string;
      message: string;
      senderType: 'client' | 'professional';
    }) => {
      try {
        const { sessionToken, message, senderType } = data;
        
        // Verify session
        const session = await ConsultationSession.findOne({ sessionToken });
        
        if (!session) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }
        
        if (session.expiresAt && new Date() > session.expiresAt) {
          socket.emit('error', { message: 'Session has expired' });
          return;
        }
        
        // Create message object
        const messageData = {
          id: Date.now().toString(),
          sessionId: session._id,
          message,
          senderType,
          timestamp: new Date(),
        };
        
        // Add message to session
        await session.addMessage(messageData);
        
        // Broadcast to all users in the consultation room
        io.to(`consultation:${session._id}`).emit('message:received', messageData);
        
        console.log(`💬 Message sent in consultation: ${session._id}`);
      } catch (error: any) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: error.message });
      }
    });
    
    /**
     * Start video/audio call signaling
     */
    socket.on('call:signal', async (data: {
      sessionToken: string;
      signal: any;
      type: 'offer' | 'answer' | 'ice-candidate';
    }) => {
      try {
        const { sessionToken, signal, type } = data;
        
        // Verify session
        const session = await ConsultationSession.findOne({ sessionToken });
        
        if (!session) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }
        
        // Forward WebRTC signal to other party
        socket.to(`consultation:${session._id}`).emit('call:signal', {
          signal,
          type,
        });
        
        console.log(`📞 Call signal (${type}) in consultation: ${session._id}`);
      } catch (error: any) {
        console.error('Error handling call signal:', error);
        socket.emit('error', { message: error.message });
      }
    });
    
    /**
     * Typing indicator
     */
    socket.on('typing:start', async (data: { sessionToken: string }) => {
      try {
        const { sessionToken } = data;
        
        const session = await ConsultationSession.findOne({ sessionToken });
        if (session) {
          socket.to(`consultation:${session._id}`).emit('typing:start');
        }
      } catch (error) {
        // Silent fail for typing indicators
      }
    });
    
    socket.on('typing:stop', async (data: { sessionToken: string }) => {
      try {
        const { sessionToken } = data;
        
        const session = await ConsultationSession.findOne({ sessionToken });
        if (session) {
          socket.to(`consultation:${session._id}`).emit('typing:stop');
        }
      } catch (error) {
        // Silent fail for typing indicators
      }
    });
    
    /**
     * Leave consultation
     */
    socket.on('leave:consultation', async (data: { sessionToken: string }) => {
      try {
        const { sessionToken } = data;
        
        const session = await ConsultationSession.findOne({ sessionToken });
        if (session) {
          socket.leave(`consultation:${session._id}`);
          console.log(`👋 Client left consultation: ${session._id}`);
        }
      } catch (error) {
        console.error('Error leaving consultation:', error);
      }
    });
    
    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });
  
  console.log('✅ WebSocket service initialized');
};

/**
 * Send notification to user via WebSocket
 * @param io - Socket.IO server instance
 * @param userId - User ID
 * @param notification - Notification data
 */
export const sendNotificationToUser = (
  io: SocketIOServer,
  userId: string,
  notification: any
) => {
  io.to(`user:${userId}`).emit('notification:new', notification);
};

/**
 * Send consultation update to session
 * @param io - Socket.IO server instance
 * @param sessionId - Session ID
 * @param update - Update data
 */
export const sendConsultationUpdate = (
  io: SocketIOServer,
  sessionId: string,
  update: any
) => {
  io.to(`consultation:${sessionId}`).emit('consultation:update', update);
};
