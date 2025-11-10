import express, { type Request } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { auditLogger, logger } from '../lib/logger.js';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const LOCKOUT_ATTEMPTS = Number(process.env.ACCOUNT_LOCKOUT_ATTEMPTS || 5);
const LOCKOUT_DURATION_MINUTES = Number(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || 30);

// Helper to get client IP
const getClientIp = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const registerMerchantSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
  contactName: z.string().min(2).optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
  plan: z.string().default('3-month'),
});

const loginMerchantSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Check if merchant account is locked
const isMerchantLocked = (merchant: any): boolean => {
  if (!merchant.accountLockedUntil) return false;
  return new Date() < merchant.accountLockedUntil;
};

// Handle failed merchant login
const handleFailedMerchantLogin = async (merchantId: string, email: string, ip: string) => {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return;

  const newFailedAttempts = merchant.failedLoginAttempts + 1;
  const shouldLock = newFailedAttempts >= LOCKOUT_ATTEMPTS;

  await prisma.merchant.update({
    where: { id: merchantId },
    data: {
      failedLoginAttempts: newFailedAttempts,
      accountLockedUntil: shouldLock
        ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : undefined,
    },
  });

  if (shouldLock) {
    logger.warn(`Merchant account locked due to ${LOCKOUT_ATTEMPTS} failed attempts`, {
      merchantId,
      email,
      ip,
    });
  }
};

// Register merchant
router.post('/register', registrationLimiter, async (req, res) => {
  const ip = getClientIp(req);

  try {
    const payload = registerMerchantSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ errors: payload.error.flatten() });
    }

    const email = normalizeEmail(payload.data.email);

    // Check if merchant exists
    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'A merchant with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(payload.data.password, 10);

    const merchant = await prisma.merchant.create({
      data: {
        email,
        passwordHash,
        businessName: payload.data.businessName,
        contactName: payload.data.contactName,
        phone: payload.data.phone,
        instagram: payload.data.instagram,
        whatsapp: payload.data.whatsapp,
        plan: payload.data.plan,
        lastLoginIp: ip,
      },
    });

    logger.info('Merchant registered', { merchantId: merchant.id, email, ip });

    const token = jwt.sign(
      {
        sub: merchant.id,
        email: merchant.email,
        type: 'merchant',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY },
    );

    res.status(201).json({
      message: 'Merchant account created successfully.',
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        contactName: merchant.contactName,
        phone: merchant.phone,
        instagram: merchant.instagram,
        whatsapp: merchant.whatsapp,
        plan: merchant.plan,
        createdAt: merchant.createdAt,
      },
    });
  } catch (error) {
    logger.error('Merchant registration error:', error);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
});

// Login merchant
router.post('/login', authLimiter, async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    const payload = loginMerchantSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ errors: payload.error.flatten() });
    }

    const email = normalizeEmail(payload.data.email);

    const merchant = await prisma.merchant.findUnique({ where: { email } });

    if (!merchant) {
      logger.warn('Merchant login failed - not found', { email, ip, userAgent });
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check if account is locked
    if (isMerchantLocked(merchant)) {
      const lockDurationMins = Math.ceil(
        (merchant.accountLockedUntil!.getTime() - Date.now()) / 60000,
      );
      logger.warn('Merchant login attempt while locked', { email, ip });
      return res.status(403).json({
        message: `Account temporarily locked due to too many failed login attempts. Please try again in ${lockDurationMins} minute(s).`,
        lockedUntil: merchant.accountLockedUntil,
      });
    }

    const passwordValid = await bcrypt.compare(payload.data.password, merchant.passwordHash);
    if (!passwordValid) {
      await handleFailedMerchantLogin(merchant.id, email, ip);
      logger.warn('Merchant login failed - invalid password', { email, ip, userAgent });

      const attemptsLeft = Math.max(0, LOCKOUT_ATTEMPTS - (merchant.failedLoginAttempts + 1));
      if (attemptsLeft > 0) {
        return res.status(401).json({
          message: 'Invalid email or password.',
          attemptsRemaining: attemptsLeft,
        });
      } else {
        return res.status(401).json({
          message: `Invalid credentials. Account will be locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
        });
      }
    }

    // Successful login
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        accountLockedUntil: null,
      },
    });

    logger.info('Merchant login successful', { merchantId: merchant.id, email, ip });

    const token = jwt.sign(
      {
        sub: merchant.id,
        email: merchant.email,
        type: 'merchant',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY },
    );

    res.json({
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        contactName: merchant.contactName,
        phone: merchant.phone,
        instagram: merchant.instagram,
        whatsapp: merchant.whatsapp,
        plan: merchant.plan,
        lastLoginAt: merchant.lastLoginAt,
      },
    });
  } catch (error) {
    logger.error('Merchant login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// Get current merchant
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.type !== 'merchant') {
      return res.status(403).json({ message: 'Invalid token type' });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: decoded.sub },
    });

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    res.json({
      merchant: {
        id: merchant.id,
        email: merchant.email,
        businessName: merchant.businessName,
        contactName: merchant.contactName,
        phone: merchant.phone,
        instagram: merchant.instagram,
        whatsapp: merchant.whatsapp,
        plan: merchant.plan,
        lastLoginAt: merchant.lastLoginAt,
        createdAt: merchant.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get merchant error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
