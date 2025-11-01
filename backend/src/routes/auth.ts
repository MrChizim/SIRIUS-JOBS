import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const authUserInclude = {
  professionalProfile: true,
  artisanProfile: true,
  employerProfile: true,
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

const collectUserRoles = (user: UserWithRelations) => {
  const roles = new Set<UserRole>();
  if (user.role) {
    roles.add(user.role);
  }
  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      roles.add(role as UserRole);
    }
  }
  if (user.artisanProfile) {
    roles.add('ARTISAN');
  }
  if (user.employerProfile) {
    roles.add('EMPLOYER');
  }
  if (user.professionalProfile && (user.role === 'DOCTOR' || user.role === 'LAWYER')) {
    roles.add(user.role);
  }
  return Array.from(roles);
};

const buildAuthResponse = (user: UserWithRelations) => {
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET ?? 'change-me',
    { expiresIn: '7d' },
  );

  const roles = collectUserRoles(user);

  return {
    token,
    roles,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      roles,
      phone: user.phone,
      verified: user.isVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      professionalProfile: user.professionalProfile,
      artisanProfile: user.artisanProfile,
      employerProfile: user.employerProfile,
    },
  };
};

const registerClientSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/register-client', async (req, res) => {
  const payload = registerClientSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const email = normalizeEmail(payload.data.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(payload.data.password, 10);
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const user = await prisma.user.create({
    data: {
      firstName: payload.data.firstName,
      lastName: payload.data.lastName,
      email,
      passwordHash,
      role: 'CLIENT',
      roles: ['CLIENT'],
      emailVerificationToken: token,
      emailVerificationTokenExpires: expires,
    },
  });

  res.status(201).json({
    message: 'Account created. Check your email for a verification link.',
    verificationToken: token,
    userId: user.id,
  });
});

const registerProfessionalSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  profession: z.enum(['DOCTOR', 'LAWYER']),
  licenseNumber: z.string().min(4),
  regulatoryBody: z.string().min(2),
  licenseDocument: z.string().min(10),
});

router.post('/register-professional', async (req, res) => {
  const payload = registerProfessionalSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const email = normalizeEmail(payload.data.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(payload.data.password, 10);
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const user = await prisma.user.create({
    data: {
      firstName: payload.data.firstName,
      lastName: payload.data.lastName,
      email,
      passwordHash,
      role: payload.data.profession,
      roles: [payload.data.profession],
      emailVerificationToken: token,
      emailVerificationTokenExpires: expires,
      professionalProfile: {
        create: {
          profession: payload.data.profession === 'DOCTOR' ? 'Doctor' : 'Lawyer',
          licenseNumber: payload.data.licenseNumber,
          regulatoryBody: payload.data.regulatoryBody,
          licenseDocumentUrl: payload.data.licenseDocument,
          licenseSubmittedAt: new Date(),
        },
      },
    },
    include: { professionalProfile: true },
  });

  res.status(201).json({
    message: 'Professional account created. Verify your email while we review your licence.',
    verificationToken: token,
    userId: user.id,
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const payload = loginSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const email = normalizeEmail(payload.data.email);

  const user = await prisma.user.findUnique({
    where: { email },
    include: authUserInclude,
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordValid = await bcrypt.compare(payload.data.password, user.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (!user.emailVerifiedAt) {
    return res.status(403).json({ message: 'Verify your email to continue.' });
  }

  res.json(buildAuthResponse(user));
});

const verifyEmailSchema = z.object({ token: z.string().min(10) });

router.post('/verify-email', async (req, res) => {
  const payload = verifyEmailSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: payload.data.token,
      emailVerificationTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return res.status(404).json({ message: 'Token invalid or expired' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
    },
  });

  res.json({ message: 'Email verified successfully.' });
});

const forgotPasswordSchema = z.object({ email: z.string().email() });

router.post('/forgot-password', async (req, res) => {
  const payload = forgotPasswordSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const email = normalizeEmail(payload.data.email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpires: expiresAt,
      },
    });
    return res.json({
      message: 'If that email exists, we sent a reset link.',
      resetToken: token,
      expiresAt,
    });
  }

  res.json({ message: 'If that email exists, we sent a reset link.' });
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

router.post('/reset-password', async (req, res) => {
  const payload = resetPasswordSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: payload.data.token,
      passwordResetTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return res.status(400).json({ message: 'Reset token is invalid or expired.' });
  }

  const passwordHash = await bcrypt.hash(payload.data.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    },
  });

  res.json({ message: 'Password updated successfully.' });
});

const registerWorkerSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().email(),
  phone: z.string().trim().min(6),
  password: z.string().min(8),
});

const registerEmployerSchema = registerWorkerSchema;

router.post('/register-worker', async (req, res) => {
  const payload = registerWorkerSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const email = normalizeEmail(payload.data.email);

  const existing = await prisma.user.findUnique({
    where: { email },
    include: authUserInclude,
  });
  if (existing) {
    const hasWorkerAccess =
      existing.role === 'ARTISAN' ||
      existing.artisanProfile !== null ||
      (existing.roles ?? []).includes('ARTISAN');

    if (hasWorkerAccess) {
      return res.status(409).json({ message: 'This account already has worker access.' });
    }

    if (payload.data.phone && payload.data.phone !== existing.phone) {
      const phoneOwner = await prisma.user.findUnique({ where: { phone: payload.data.phone } });
      if (phoneOwner && phoneOwner.id !== existing.id) {
        return res.status(409).json({ message: 'Phone number already registered' });
      }
    }

    const updatedRoles = Array.from(new Set([...(existing.roles ?? []), 'ARTISAN']));
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName: existing.firstName || payload.data.firstName,
        lastName: existing.lastName || payload.data.lastName,
        phone: payload.data.phone || existing.phone,
        roles: updatedRoles,
        role: existing.role === 'EMPLOYER' ? existing.role : 'ARTISAN',
        isVerified: true,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      },
      include: authUserInclude,
    });

    return res.status(200).json({
      message: 'Worker access added to your account.',
      ...buildAuthResponse(user),
    });
  }

  if (payload.data.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: payload.data.phone },
    });
    if (existingPhone) {
      return res.status(409).json({ message: 'Phone number already registered' });
    }
  }

  const passwordHash = await bcrypt.hash(payload.data.password, 10);
  const user = await prisma.user.create({
    data: {
      firstName: payload.data.firstName,
      lastName: payload.data.lastName,
      email,
      phone: payload.data.phone,
      passwordHash,
      role: 'ARTISAN',
       roles: ['ARTISAN'],
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
    include: authUserInclude,
  });

  res.status(201).json({
    message: 'Worker account created successfully.',
    ...buildAuthResponse(user),
  });
});

router.post('/register-employer', async (req, res) => {
  const payload = registerEmployerSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const email = normalizeEmail(payload.data.email);

  const existing = await prisma.user.findUnique({
    where: { email },
    include: authUserInclude,
  });
  if (existing) {
    const hasEmployerAccess =
      existing.role === 'EMPLOYER' ||
      existing.employerProfile !== null ||
      (existing.roles ?? []).includes('EMPLOYER') ||
      (existing.roles ?? []).includes('ADMIN');

    if (hasEmployerAccess) {
      return res.status(409).json({ message: 'This account already has employer access.' });
    }

    if (payload.data.phone && payload.data.phone !== existing.phone) {
      const phoneOwner = await prisma.user.findUnique({ where: { phone: payload.data.phone } });
      if (phoneOwner && phoneOwner.id !== existing.id) {
        return res.status(409).json({ message: 'Phone number already registered' });
      }
    }

    const updatedRoles = Array.from(new Set([...(existing.roles ?? []), 'EMPLOYER']));
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName: existing.firstName || payload.data.firstName,
        lastName: existing.lastName || payload.data.lastName,
        phone: payload.data.phone || existing.phone,
        roles: updatedRoles,
        role: existing.role === 'ARTISAN' ? existing.role : 'EMPLOYER',
        isVerified: true,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        employerProfile: existing.employerProfile
          ? undefined
          : {
              create: {},
            },
      },
      include: authUserInclude,
    });

    return res.status(200).json({
      message: 'Employer access added to your account.',
      ...buildAuthResponse(user),
    });
  }

  if (payload.data.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: payload.data.phone },
    });
    if (existingPhone) {
      return res.status(409).json({ message: 'Phone number already registered' });
    }
  }

  const passwordHash = await bcrypt.hash(payload.data.password, 10);
  const user = await prisma.user.create({
    data: {
      firstName: payload.data.firstName,
      lastName: payload.data.lastName,
      email,
      phone: payload.data.phone,
      passwordHash,
      role: 'EMPLOYER',
      roles: ['EMPLOYER'],
      isVerified: true,
      emailVerifiedAt: new Date(),
      employerProfile: {
        create: {},
      },
    },
    include: authUserInclude,
  });

  res.status(201).json({
    message: 'Employer account created successfully.',
    ...buildAuthResponse(user),
  });
});

const extendRoleSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  targetRole: z.enum(['ARTISAN', 'EMPLOYER']),
  phone: z.string().trim().min(6).optional(),
});

router.post('/extend-role', async (req, res) => {
  const payload = extendRoleSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  const email = normalizeEmail(payload.data.email);
  const user = await prisma.user.findUnique({
    where: { email },
    include: authUserInclude,
  });

  if (!user) {
    return res.status(404).json({ message: 'We could not find an account with that email.' });
  }

  const passwordValid = await bcrypt.compare(payload.data.password, user.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ message: 'Incorrect password. Please try again.' });
  }

  const currentRoles = collectUserRoles(user);
  if (currentRoles.includes(payload.data.targetRole)) {
    return res.status(200).json({
      message: 'This account already has that access level.',
      ...buildAuthResponse(user),
    });
  }

  if (payload.data.targetRole === 'ARTISAN') {
    const phone = payload.data.phone ?? user.phone;
    if (!phone) {
      return res.status(400).json({ message: 'Add a phone number to continue.' });
    }
    const updatedRoles = Array.from(new Set([...(user.roles ?? []), 'ARTISAN']));
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        roles: updatedRoles,
        role: user.role === 'EMPLOYER' ? user.role : 'ARTISAN',
        isVerified: user.isVerified || true,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
      include: authUserInclude,
    });

    return res.json({
      message: 'Worker tools activated on your account.',
      ...buildAuthResponse(updatedUser),
    });
  }

  if (payload.data.targetRole === 'EMPLOYER') {
    const phone = payload.data.phone ?? user.phone;
    if (!phone) {
      return res.status(400).json({ message: 'Add a phone number to continue.' });
    }
    const updatedRoles = Array.from(new Set([...(user.roles ?? []), 'EMPLOYER']));
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        roles: updatedRoles,
        role: user.role === 'ARTISAN' ? user.role : 'EMPLOYER',
        isVerified: user.isVerified || true,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        employerProfile: user.employerProfile
          ? undefined
          : {
              create: {},
            },
      },
      include: authUserInclude,
    });

    return res.json({
      message: 'Employer tools activated on your account.',
      ...buildAuthResponse(updatedUser),
    });
  }

  return res.status(400).json({ message: 'Role extension not supported yet.' });
});

export default router;
