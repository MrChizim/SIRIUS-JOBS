import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import jobsRouter from './routes/jobs.js';
import applicationsRouter from './routes/applications.js';
import servicesRouter from './routes/services.js';
import profilesRouter from './routes/profiles.js';
import verificationRouter from './routes/verification.js';
import paymentsRouter from './routes/payments.js';
import dashboardRouter from './routes/dashboard.js';
import alertsRouter from './routes/alerts.js';
import authRouter from './routes/auth.js';
import marketplaceRouter, { publicMarketplaceRouter } from './routes/marketplace.js';
import consultationProfessionalsRouter from './routes/consultation-professionals.js';
import consultationPaymentRouter from './routes/consultation-payment.js';
import consultationSessionsRouter from './routes/consultation-sessions.js';
import consultationRegisterRouter from './routes/consultation-register.js';
import consultationProfessionalManagementRouter from './routes/consultation-professional-management.js';
import { apiLimiter, speedLimiter } from './middleware/rateLimiter.js';
import { logger } from './lib/logger.js';

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

// API Routes
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/alerts', alertsRouter);

// Authentication Routes
app.use('/api/auth', authRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/merchants', marketplaceRouter);
app.use('/api/public', publicMarketplaceRouter);

// Consultation Routes
app.use('/api/consultation', consultationRegisterRouter);
app.use('/api/consultation/professionals', consultationProfessionalManagementRouter); // Profile & payout management (authenticated)
app.use('/api/consultation/professionals', consultationProfessionalsRouter); // Public professional listings
app.use('/api/consultation/payment', consultationPaymentRouter);
app.use('/api/consultation/sessions', consultationSessionsRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;
