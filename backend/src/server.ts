import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { events } from './services/event-bus.js';
import { startLicenseRecheckWorker, primeLicenseQueueFromDatabase } from './services/license-recheck-queue.js';

const port = Number(process.env.PORT ?? 4000);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN?.split(',') ?? ['http://localhost:5173'],
  },
});

io.on('connection', socket => {
  const userId = socket.handshake.auth?.userId as string | undefined;
  if (userId) {
    socket.join(`user:${userId}`);
  }
});

events.on('notification:new', payload => {
  if (!payload.userId) return;
  io.to(`user:${payload.userId}`).emit('notification:new', payload);
});

startLicenseRecheckWorker();
primeLicenseQueueFromDatabase().catch(error => {
  console.error('Unable to prime licence recheck queue', error);
});

server.listen(port, () => {
  console.log(`Sirius Jobs API listening on port ${port}`);
});
