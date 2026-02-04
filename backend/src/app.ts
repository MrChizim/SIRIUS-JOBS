import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

// Mongo-first routes (v2)
import authRoutes from './routes/auth.routes';
import workerRoutes from './routes/worker.routes';
import analyticsRoutes from './routes/analytics.routes';
import jobRoutes from './routes/job.routes';
import employerRoutes from './routes/employer.routes';
import professionalRoutes from './routes/professional.routes';
import merchantRoutes from './routes/merchant.routes';
import paymentRoutes from './routes/payment.routes';
import consultationRoutes from './routes/consultation.routes';
import servicesRoutes from './routes/services.routes';
import alertsRoutes from './routes/alerts.routes';
import uploadRoutes from './routes/upload.routes';
import dashboardRoutes from './routes/dashboard.routes';
import profilesRoutes from './routes/profiles.routes';
import applicationsRoutes from './routes/applications.routes';
import publicRoutes from './routes/public.routes';
import { apiLimiter, speedLimiter } from './middleware/rateLimiter';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error.middleware';

const rawOrigins = process.env.CLIENT_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean) ?? [];
const corsOrigin = rawOrigins.length > 0 ? rawOrigins : true;

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

// Rate limiting and speed control
app.use(speedLimiter);
app.use('/api/', apiLimiter);

// Request parsing
app.use(json({ limit: '2mb' }));
app.use(urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded files statically
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.join(process.cwd(), uploadDir)));

// Legacy API Routes (backward compatibility - no version prefix)
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/consultation', consultationRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/applications', applicationsRoutes);

// Mongo API Routes (v2 - same routes with version prefix)
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/upload', uploadRoutes);
app.use('/api/v2/workers', workerRoutes);
app.use('/api/v2/analytics', analyticsRoutes);
app.use('/api/v2/jobs', jobRoutes);
app.use('/api/v2/employers', employerRoutes);
app.use('/api/v2/professionals', professionalRoutes);
app.use('/api/v2/merchants', merchantRoutes);
app.use('/api/v2/payments', paymentRoutes);
app.use('/api/v2/services', servicesRoutes);
app.use('/api/v2/alerts', alertsRoutes);
app.use('/api/v2/public', publicRoutes);

// 404 handler - must come before error handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler - must be last
app.use(errorHandler);

export default app;
