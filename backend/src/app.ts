import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { json, urlencoded } from 'express';

import jobsRouter from './routes/jobs.js';
import applicationsRouter from './routes/applications.js';
import servicesRouter from './routes/services.js';
import profilesRouter from './routes/profiles.js';
import verificationRouter from './routes/verification.js';
import paymentsRouter from './routes/payments.js';
import dashboardRouter from './routes/dashboard.js';
import alertsRouter from './routes/alerts.js';
import consultationsRouter from './routes/consultations.js';
import authRouter from './routes/auth.js';

const rawOrigins = process.env.CLIENT_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean) ?? [];
const corsOrigin = rawOrigins.length > 0 ? rawOrigins : true;

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(json({ limit: '1mb' }));
app.use(urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/auth', authRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;
