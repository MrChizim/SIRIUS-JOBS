/**
 * Authentication Controller
 * Handle all authentication-related requests
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { sendSuccess, sendError, sendCreated } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { verifyRefreshToken } from '../utils/jwt.util';
import { commonSchemas } from '../middleware/validation.middleware';

/**
 * Register validation schema (accepts frontend format)
 */
const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  username: z.string().min(2, 'Username must be at least 2 characters').max(30).optional(),
  email: commonSchemas.email,
  phone: z.string().optional(),
  password: commonSchemas.password,
  confirmPassword: z.string().optional(),
});

/**
 * Legacy register validation schema (for /api/auth/register)
 */
const legacyRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: commonSchemas.email,
  password: commonSchemas.password,
  accountType: z.enum(['worker', 'employer', 'professional', 'merchant', 'client']),
});

/**
 * Login validation schema
 */
const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Google sign-in validation schema
 */
const googleSignInSchema = z.object({
  googleId: z.string().min(1),
  email: commonSchemas.email,
  name: z.string().min(2),
  accountType: z.enum(['worker', 'employer', 'professional', 'merchant', 'client']),
});

/**
 * Register a new user
 * POST /api/auth/register or /api/auth/register-{accountType}
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Determine accountType from route path
  const path = req.path;
  let accountType: 'worker' | 'employer' | 'professional' | 'merchant' | 'client' = 'worker';

  if (path.includes('register-worker')) {
    accountType = 'worker';
  } else if (path.includes('register-employer')) {
    accountType = 'employer';
  } else if (path.includes('register-professional')) {
    accountType = 'professional';
  } else if (path.includes('register-merchant')) {
    accountType = 'merchant';
  } else if (path.includes('register-client')) {
    accountType = 'client';
  }

  // Try frontend format first (firstName, lastName)
  const frontendValidation = registerSchema.safeParse(req.body);

  if (frontendValidation.success) {
    const { firstName, lastName, username, email, phone, password } = frontendValidation.data;
    const name = `${firstName} ${lastName}`.trim();

    // Extract additional fields for specific account types
    const additionalData: any = {};

    if (accountType === 'professional') {
      additionalData.professionalType = req.body.professionalType; // doctor or lawyer
    }

    if (accountType === 'merchant') {
      additionalData.businessName = req.body.businessName;
      additionalData.category = req.body.category;
    }

    if (accountType === 'client' && !username) {
      return sendError(res, 'Username is required for client accounts', 400);
    }

    const result = await authService.registerUser({
      name,
      username,
      email,
      phone,
      password,
      accountType,
      ...additionalData,
    } as any);

    return sendCreated(res, result, 'Account created successfully');
  }

  // Fallback to legacy format (single name field, accountType in body)
  const legacyValidation = legacyRegisterSchema.safeParse(req.body);

  if (!legacyValidation.success) {
    // Return the more user-friendly frontend validation errors
    return sendError(res, 'Validation failed', 400, frontendValidation.error.errors);
  }

  const result = await authService.registerUser(legacyValidation.data as any);

  return sendCreated(res, result, 'Account created successfully');
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const validation = loginSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const { email, password } = validation.data;
  
  const result = await authService.loginUser(email, password);
  
  return sendSuccess(res, result, 'Login successful');
});

/**
 * Google sign-in
 * POST /api/auth/google
 */
export const googleSignIn = asyncHandler(async (req: Request, res: Response) => {
  const validation = googleSignInSchema.safeParse(req.body);

  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }

  const result = await authService.googleSignIn(validation.data as any);

  return sendSuccess(res, result, 'Google sign-in successful');
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return sendError(res, 'Refresh token is required', 400);
  }
  
  // Verify refresh token
  try {
    verifyRefreshToken(refreshToken);
  } catch (error) {
    return sendError(res, 'Invalid refresh token', 401);
  }
  
  const tokens = await authService.refreshAccessToken(refreshToken);
  
  return sendSuccess(res, tokens, 'Token refreshed successfully');
});

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Not authenticated', 401);
  }
  
  await authService.logoutUser(req.user.userId);
  
  return sendSuccess(res, null, 'Logged out successfully');
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Not authenticated', 401);
  }
  
  const profile = await authService.getUserProfile(
    req.user.userId,
    req.user.accountType
  );
  
  return sendSuccess(res, profile);
});

/**
 * Verify email
 * POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return sendError(res, 'Verification token is required', 400);
  }

  const result = await authService.verifyUserEmail(token);

  return sendSuccess(res, result, 'Email verified successfully');
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const validation = z.object({ email: commonSchemas.email }).safeParse(req.body);

  if (!validation.success) {
    return sendError(res, 'Valid email is required', 400);
  }

  await authService.requestPasswordReset(validation.data.email);

  return sendSuccess(res, null, 'If that email exists, a password reset link has been sent');
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const validation = z.object({
    token: z.string().min(1),
    password: commonSchemas.password,
  }).safeParse(req.body);

  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }

  await authService.resetUserPassword(validation.data.token, validation.data.password);

  return sendSuccess(res, null, 'Password reset successfully');
});

/**
 * Extend user account with additional role
 * POST /api/auth/extend-role
 */
export const extendRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Not authenticated', 401);
  }

  const validation = z.object({
    newAccountType: z.enum(['worker', 'employer', 'professional', 'merchant']),
  }).safeParse(req.body);

  if (!validation.success) {
    return sendError(res, 'Valid account type is required', 400);
  }

  const result = await authService.extendUserRole(
    req.user.userId,
    validation.data.newAccountType
  );

  return sendSuccess(res, result, 'Account role extended successfully');
});
