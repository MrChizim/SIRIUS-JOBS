import express, { type Request } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { auditLogger, logger } from '../lib/logger.js';
import { authLimiter, registrationLimiter } from '../middleware/rateLimiter.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const LOCKOUT_ATTEMPTS = Number(process.env.ACCOUNT_LOCKOUT_ATTEMPTS || 5);
const LOCKOUT_DURATION_MINUTES = Number(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || 30);
const createMerchantToken = (merchantId: string, email: string) =>
  jwt.sign(
    {
      sub: merchantId,
      email,
      role: 'merchant',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );

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

const sessionExpired = (res: express.Response) => res.status(401).json({ message: 'Session expired' });
const getMerchantId = (req: AuthenticatedRequest) => req.user?.id ?? '';

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

const analyticsEventSchema = z.object({
  vendorId: z.string().min(2),
  eventType: z.enum(['PROFILE_VIEW', 'WHATSAPP_CLICK', 'INSTAGRAM_CLICK']),
});

const listingBaseSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  description: z.string().min(10, 'Description should be at least 10 characters'),
  location: z.string().min(2, 'Location is required'),
  category: z.string().min(2, 'Category is required'),
  images: z.array(z.string().url()).optional().default([]),
  headline: z.string().optional(),
  delivery: z.string().optional(),
  highlights: z.array(z.string().min(1)).optional().default([]),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  hero: z.boolean().optional(),
  logoUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  owner: z.string().optional(),
  ownerEmail: z.string().email().optional(),
});

const listingCreateSchema = listingBaseSchema;
const listingUpdateSchema = listingBaseSchema.partial();

const planUpdateSchema = z.object({
  plan: z.enum(['PENDING_SELECTION', '3-month', '6-month', '12-month']),
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
      return res.status(400).json({ message: 'Merchant already exists' });
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

    const token = createMerchantToken(merchant.id, merchant.email);

    res.status(201).json({
      message: 'Account created',
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
      return res.status(401).json({ message: 'Invalid credentials' });
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
          message: 'Invalid credentials',
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

    const token = createMerchantToken(merchant.id, merchant.email);

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
router.get('/me', requireAuth(['merchant']), async (req: AuthenticatedRequest, res) => {
  try {
    const merchantId = getMerchantId(req);
    if (!merchantId) {
      return sessionExpired(res);
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
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
    res.status(500).json({ message: 'Unable to load merchant profile' });
  }
});

// Merchant listings CRUD
router.get('/listings', requireAuth(['merchant']), async (req: AuthenticatedRequest, res) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    return sessionExpired(res);
  }
  const listings = await prisma.marketplaceListing.findMany({
    where: { merchantId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ listings });
});

router.post('/listings', requireAuth(['merchant']), async (req: AuthenticatedRequest, res) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    return sessionExpired(res);
  }
  const payload = listingCreateSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }
  const listing = await prisma.marketplaceListing.create({
    data: {
      ...payload.data,
      merchant: { connect: { id: merchantId } },
    },
  });
  res.status(201).json({ listing });
});

router.put('/listings/:id', requireAuth(['merchant']), async (req: AuthenticatedRequest, res) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    return sessionExpired(res);
  }
  const listingId = req.params.id;
  const payload = listingUpdateSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }
  const existing = await prisma.marketplaceListing.findUnique({ where: { id: listingId } });
  if (!existing || existing.merchantId !== merchantId) {
    return res.status(404).json({ message: 'Listing not found' });
  }
  const listing = await prisma.marketplaceListing.update({
    where: { id: listingId },
    data: payload.data,
  });
  res.json({ listing });
});

router.post('/plan', requireAuth(['merchant']), async (req: AuthenticatedRequest, res) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    return sessionExpired(res);
  }

  const payload = planUpdateSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  try {
    const merchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: { plan: payload.data.plan },
      select: {
        id: true,
        email: true,
        businessName: true,
        plan: true,
      },
    });

    logger.info('Merchant plan updated', { merchantId, plan: payload.data.plan });
    res.json({
      message: 'Plan selection saved. Our team will follow up with payment instructions shortly.',
      plan: merchant.plan,
    });
  } catch (error) {
    logger.error('Merchant plan update failed', error);
    res.status(500).json({ message: 'Unable to update plan right now. Please try again later.' });
  }
});

router.delete('/listings/:id', requireAuth(['merchant']), async (req: AuthenticatedRequest, res) => {
  const merchantId = getMerchantId(req);
  if (!merchantId) {
    return sessionExpired(res);
  }
  const listingId = req.params.id;
  const existing = await prisma.marketplaceListing.findUnique({ where: { id: listingId } });
  if (!existing || existing.merchantId !== merchantId) {
    return res.status(404).json({ message: 'Listing not found' });
  }
  await prisma.marketplaceListing.delete({ where: { id: listingId } });
  res.status(204).end();
});

router.post('/analytics/event', async (req, res) => {
  const payload = analyticsEventSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const { vendorId, eventType } = payload.data;

  try {
    const createData = {
      vendorId,
      profileViews: eventType === 'PROFILE_VIEW' ? 1 : 0,
      whatsappClicks: eventType === 'WHATSAPP_CLICK' ? 1 : 0,
      instagramClicks: eventType === 'INSTAGRAM_CLICK' ? 1 : 0,
      lastEventAt: new Date(),
    };

    const updateData: Record<string, any> = {
      lastEventAt: new Date(),
    };

    if (eventType === 'PROFILE_VIEW') {
      updateData.profileViews = { increment: 1 };
    }
    if (eventType === 'WHATSAPP_CLICK') {
      updateData.whatsappClicks = { increment: 1 };
    }
    if (eventType === 'INSTAGRAM_CLICK') {
      updateData.instagramClicks = { increment: 1 };
    }

    await prisma.marketplaceAnalytics.upsert({
      where: { vendorId },
      create: createData,
      update: updateData,
    });

    res.json({ message: 'Analytics event tracked' });
  } catch (error) {
    logger.error('Marketplace analytics event error:', error);
    res.status(500).json({ message: 'Unable to record analytics event' });
  }
});

router.get('/analytics/:vendorId', async (req, res) => {
  const vendorId = req.params.vendorId?.trim();
  if (!vendorId) {
    return res.status(400).json({ message: 'Vendor ID is required' });
  }

  try {
    const analytics = await prisma.marketplaceAnalytics.findUnique({
      where: { vendorId },
    });

    const profileViews = analytics?.profileViews ?? 0;
    const whatsappClicks = analytics?.whatsappClicks ?? 0;
    const instagramClicks = analytics?.instagramClicks ?? 0;
    const totalClicks = whatsappClicks + instagramClicks;

    res.json({
      vendorId,
      profileViews,
      whatsappClicks,
      instagramClicks,
      totalClicks,
      lastEventAt: analytics?.lastEventAt ?? null,
      updatedAt: analytics?.updatedAt ?? null,
    });
  } catch (error) {
    logger.error('Marketplace analytics fetch error:', error);
    res.status(500).json({ message: 'Unable to fetch analytics' });
  }
});

const publicMarketplaceRouter = express.Router();

publicMarketplaceRouter.get('/listings', async (_req, res) => {
  try {
    const listings = await prisma.marketplaceListing.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ listings });
  } catch (error) {
    logger.error('Public marketplace listings error:', error);
    res.status(500).json({ message: 'Unable to load marketplace listings' });
  }
});

export { publicMarketplaceRouter };
export default router;
