import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { events } from './services/event-bus.js';
import { startLicenseRecheckWorker, primeLicenseQueueFromDatabase } from './services/license-recheck-queue.js';
import { connectMongo } from './config/mongo.js';
import { verifyClientSessionToken } from './utils/consultationUtils.js';
import { ConsultationSession } from './models/ConsultationSession.js';
import { Message } from './models/Message.js';

const port = Number(process.env.PORT ?? 4000);
async function bootstrap() {
  // Connect to MongoDB for consultation features
  try {
    await connectMongo();
  } catch (error) {
    console.warn('[mongo] Consultation features will be unavailable');
  }

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(',') ?? ['http://localhost:5173', 'http://localhost:5500', 'http://127.0.0.1:5500'],
      credentials: true,
    },
  });

  app.set('io', io);

  // Socket.io connection handling
  io.on('connection', socket => {
    console.log('Socket connected:', socket.id);

    // Job board user connections
    const userId = socket.handshake.auth?.userId as string | undefined;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Consultation session connections
    const sessionToken = socket.handshake.auth?.sessionToken as string | undefined;
    const professionalId = socket.handshake.auth?.professionalId as string | undefined;

    if (sessionToken) {
      // Client connecting to consultation
      const decoded = verifyClientSessionToken(sessionToken);
      if (decoded) {
        socket.data.sessionId = decoded.sessionId;
        socket.data.clientAnonymousId = decoded.clientAnonymousId;
        socket.data.userType = 'client';
        socket.join(`consultation:${decoded.sessionId}`);
        console.log(`Client ${decoded.clientAnonymousId} joined consultation ${decoded.sessionId}`);
      }
    } else if (professionalId) {
      // Professional connecting to consultation
      socket.data.professionalId = professionalId;
      socket.data.userType = 'professional';
      socket.join(`professional:${professionalId}`);
      console.log(`Professional ${professionalId} connected`);
    }

    // Handle consultation message
    socket.on('consultation:message', async (data) => {
      try {
        const { sessionId, content } = data;

        if (!content || content.trim().length === 0 || content.length > 2000) {
          socket.emit('consultation:error', { message: 'Invalid message content' });
          return;
        }

        // Verify user can send to this session
        const session = await ConsultationSession.findById(sessionId);
        if (!session) {
          socket.emit('consultation:error', { message: 'Session not found' });
          return;
        }

        if (session.status !== 'active' && session.status !== 'pending') {
          socket.emit('consultation:error', { message: 'Session is not active' });
          return;
        }

        // Check if session expired
        if (session.endsAt && new Date() > session.endsAt) {
          socket.emit('consultation:error', { message: 'Session has expired' });
          return;
        }

        let senderId: string;
        let senderType: 'client' | 'professional';

        if (socket.data.userType === 'client') {
          if (socket.data.sessionId !== sessionId) {
            socket.emit('consultation:error', { message: 'Unauthorized' });
            return;
          }
          senderId = socket.data.clientAnonymousId;
          senderType = 'client';
        } else if (socket.data.userType === 'professional') {
          if (session.professionalId.toString() !== socket.data.professionalId) {
            socket.emit('consultation:error', { message: 'Unauthorized' });
            return;
          }
          senderId = 'professional';
          senderType = 'professional';
        } else {
          socket.emit('consultation:error', { message: 'Unauthorized' });
          return;
        }

        // Save message to database
        const message = new Message({
          sessionId: session._id,
          senderId,
          senderType,
          content: content.trim(),
          messageType: 'text',
          isRead: false,
        });

        await message.save();

        // Update session last message time
        session.lastMessageAt = new Date();
        if (senderType === 'client') {
          session.hasUnreadMessages = true;
        }

        // Activate session if it's pending
        if (session.status === 'pending') {
          session.status = 'active';
          session.startedAt = new Date();
          session.endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        }

        await session.save();

        // Broadcast message to all users in the consultation room
        io.to(`consultation:${sessionId}`).emit('consultation:message', {
          id: message._id,
          sessionId: message.sessionId,
          senderId: message.senderId,
          senderType: message.senderType,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
        });

        console.log(`Message sent in session ${sessionId} by ${senderType}`);
      } catch (error) {
        console.error('Error handling consultation message:', error);
        socket.emit('consultation:error', { message: 'Failed to send message' });
      }
    });

    // Handle WebRTC signaling for video/audio calls
    socket.on('consultation:signal', async (data) => {
      try {
        const { sessionId, signal } = data;

        // Verify user is part of this session
        const session = await ConsultationSession.findById(sessionId);
        if (!session) {
          return;
        }

        if (session.status !== 'active') {
          return;
        }

        let authorized = false;
        if (socket.data.userType === 'client' && socket.data.sessionId === sessionId) {
          authorized = true;
        } else if (socket.data.userType === 'professional' && session.professionalId.toString() === socket.data.professionalId) {
          authorized = true;
        }

        if (!authorized) {
          return;
        }

        // Forward signal to other party in the session (excluding sender)
        socket.to(`consultation:${sessionId}`).emit('consultation:signal', {
          signal,
          from: socket.data.userType,
        });

        console.log(`WebRTC signal forwarded in session ${sessionId}`);
      } catch (error) {
        console.error('Error handling WebRTC signal:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  events.on('notification:new', payload => {
    if (!payload.userId) return;
    io.to(`user:${payload.userId}`).emit('notification:new', payload);
  });

  console.log('[socket] Socket.IO started');
  startLicenseRecheckWorker();
  primeLicenseQueueFromDatabase().catch(error => {
    console.error('Unable to prime licence recheck queue', error);
  });

  server.listen(port, () => {
    console.log(`Express listening on port ${port}`);
  });
}

bootstrap().catch(error => {
  console.error('Unable to bootstrap server', error);
  process.exit(1);
});
