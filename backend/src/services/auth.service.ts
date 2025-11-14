/**
 * Authentication Service
 * Business logic for user authentication and authorization
 */

import { User } from '../models/User.model';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { EmployerProfile } from '../models/EmployerProfile.model';
import { ProfessionalProfile } from '../models/ProfessionalProfile.model';
import { MerchantProfile } from '../models/MerchantProfile.model';
import { Analytics } from '../models/Analytics.model';
import { generateTokenPair } from '../utils/jwt.util';
import { validatePassword } from '../utils/password.util';
import { AccountType } from '../types';
import { AppError } from '../middleware/error.middleware';

/**
 * Format user response for frontend
 * Transforms backend format to match frontend session-utils.js expectations
 */
const formatAuthResponse = (user: any, tokens: { accessToken: string; refreshToken: string }) => {
  // Split name into firstName and lastName
  const nameParts = (user.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || firstName;

  // Map accountType to role
  const roleMap: Record<AccountType, string> = {
    worker: 'ARTISAN',
    employer: 'EMPLOYER',
    professional: 'DOCTOR', // Can be DOCTOR or LAWYER - frontend handles
    merchant: 'MERCHANT',
  };

  const role = roleMap[user.accountType as AccountType] || 'ARTISAN';
  const roles = [role];

  // Return frontend-compatible format
  return {
    token: tokens.accessToken,        // session-utils expects 'token'
    accessToken: tokens.accessToken,  // keep for backward compatibility
    refreshToken: tokens.refreshToken,
    user: {
      id: user._id?.toString() || user.id,  // session-utils expects 'id'
      _id: user._id?.toString() || user.id, // keep for backward compatibility
      email: user.email,
      name: user.name,
      firstName,
      lastName,
      accountType: user.accountType,
      role,
      roles,
      isVerified: user.isVerified || false,
      verified: user.isVerified || false,
      emailVerifiedAt: user.isVerified ? (user.createdAt?.toISOString() || new Date().toISOString()) : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
};

/**
 * Register a new user
 * @param userData - User registration data
 * @returns Created user and tokens
 */
export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
  googleId?: string;
  professionalType?: string;
  businessName?: string;
  category?: string;
}) => {
  // Validate password
  const passwordValidation = validatePassword(userData.password);
  if (!passwordValidation.valid) {
    throw new AppError(passwordValidation.message, 400);
  }

  // Check if user exists
  const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  // Create user
  const user = await User.create({
    name: userData.name,
    email: userData.email.toLowerCase(),
    password: userData.password,
    accountType: userData.accountType,
    googleId: userData.googleId,
    isVerified: userData.googleId ? true : false, // Auto-verify Google users
  });

  // Create profile based on account type
  await createUserProfile(user._id!.toString(), userData.accountType, userData);

  // Create analytics record
  await Analytics.create({
    userId: user._id!.toString(),
    accountType: userData.accountType,
    metrics: {},
  });

  // Generate tokens
  const tokens = generateTokenPair(
    user._id!.toString(),
    user.email,
    user.accountType
  );

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return formatAuthResponse(user, tokens);
};

/**
 * Login user
 * @param email - User email
 * @param password - User password
 * @returns User and tokens
 */
export const loginUser = async (email: string, password: string) => {
  // Find user with password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const tokens = generateTokenPair(
    user._id!.toString(),
    user.email,
    user.accountType
  );

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return formatAuthResponse(user, tokens);
};

/**
 * Google sign-in
 * @param googleData - Google OAuth data
 * @returns User and tokens
 */
export const googleSignIn = async (googleData: {
  googleId: string;
  email: string;
  name: string;
  accountType: AccountType;
}) => {
  // Check if user exists with Google ID
  let user = await User.findOne({ googleId: googleData.googleId });

  if (!user) {
    // Check if email exists
    user = await User.findOne({ email: googleData.email.toLowerCase() });

    if (user) {
      // Link Google account to existing user
      user.googleId = googleData.googleId;
      user.isVerified = true;
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        name: googleData.name,
        email: googleData.email.toLowerCase(),
        accountType: googleData.accountType,
        googleId: googleData.googleId,
        isVerified: true,
      });

      // Create profile
      await createUserProfile(user._id!.toString(), googleData.accountType);

      // Create analytics
      await Analytics.create({
        userId: user._id!.toString(),
        accountType: googleData.accountType,
        metrics: {},
      });
    }
  }

  // Generate tokens
  const tokens = generateTokenPair(
    user._id!.toString(),
    user.email,
    user.accountType
  );

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return formatAuthResponse(user, tokens);
};

/**
 * Refresh access token
 * @param refreshToken - Refresh token
 * @returns New access token
 */
export const refreshAccessToken = async (refreshToken: string) => {
  const user = await User.findOne({ refreshToken }).select('+refreshToken');

  if (!user) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Generate new tokens
  const tokens = generateTokenPair(
    user._id!.toString(),
    user.email,
    user.accountType
  );

  // Update refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return tokens;
};

/**
 * Logout user
 * @param userId - User ID
 */
export const logoutUser = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

/**
 * Create profile for a specific account type
 */
const createProfileForAccountType = async (accountType: AccountType, userId: string, additionalData?: any) => {
  switch (accountType) {
    case 'worker':
      await WorkerProfile.create({ userId });
      break;
    case 'employer':
      await EmployerProfile.create({ userId });
      break;
    case 'professional':
      await ProfessionalProfile.create({
        userId,
        professionalType: additionalData?.professionalType,
      });
      break;
    case 'merchant':
      await MerchantProfile.create({
        userId,
        businessName: additionalData?.businessName,
        category: additionalData?.category,
      });
      break;
  }
};

/**
 * Create user profile wrapper
 */
const createUserProfile = async (userId: string, accountType: AccountType, additionalData?: any) => {
  await createProfileForAccountType(accountType, userId, additionalData);
};

/**
 * Get user profile
 * @param userId - User ID
 * @param accountType - Account type
 * @returns User profile
 */
export const getUserProfile = async (userId: string, accountType: AccountType) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  let profile = null;

  switch (accountType) {
    case 'worker':
      profile = await WorkerProfile.findOne({ userId });
      break;
    case 'employer':
      profile = await EmployerProfile.findOne({ userId });
      break;
    case 'professional':
      profile = await ProfessionalProfile.findOne({ userId });
      break;
    case 'merchant':
      profile = await MerchantProfile.findOne({ userId });
      break;
  }

  return {
    user: user.toJSON(),
    profile,
  };
};

/**
 * Verify user email
 * @param token - Email verification token (JWT)
 * @returns Success status
 */
export const verifyUserEmail = async (token: string) => {
  const crypto = require('crypto');
  const jwt = require('jsonwebtoken');
  
  try {
    // Decode verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me') as { userId: string };
    
    // Find and update user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isVerified) {
      return { message: 'Email already verified' };
    }

    user.isVerified = true;
    await user.save();

    return { message: 'Email verified successfully' };
  } catch (error) {
    throw new AppError('Invalid or expired verification token', 400);
  }
};

/**
 * Request password reset
 * @param email - User email
 */
export const requestPasswordReset = async (email: string) => {
  const crypto = require('crypto');
  const jwt = require('jsonwebtoken');
  const { sendPasswordResetEmail } = require('./email.service');
  
  // Find user (don't reveal if user exists for security)
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return success anyway to prevent email enumeration
    return;
  }
  
  // Generate reset token (expires in 1 hour)
  const resetToken = jwt.sign(
    { userId: user._id, type: 'password-reset' },
    process.env.JWT_SECRET || 'change-me',
    { expiresIn: '1h' }
  );
  
  // Create reset link
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/reset-password.html?token=${resetToken}`;
  
  // Send email
  await sendPasswordResetEmail(email, resetLink);
};

/**
 * Reset user password
 * @param token - Reset token
 * @param newPassword - New password
 */
export const resetUserPassword = async (token: string, newPassword: string) => {
  const jwt = require('jsonwebtoken');
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me') as { 
      userId: string;
      type: string;
    };
    
    if (decoded.type !== 'password-reset') {
      throw new AppError('Invalid token type', 400);
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message, 400);
    }
    
    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();
    
    // Invalidate refresh token
    user.refreshToken = undefined;
    await user.save();
    
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Password reset link has expired', 400);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(error.message || 'Invalid password reset token', 400);
  }
};

/**
 * Extend user account with additional role
 * @param userId - User ID
 * @param newAccountType - New account type to add
 * @returns Updated user data
 */
export const extendUserRole = async (userId: string, newAccountType: AccountType) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user already has this account type
  if (user.accountType === newAccountType) {
    throw new AppError('You already have this account type', 400);
  }
  
  // Create profile for new account type
  await createProfileForAccountType(newAccountType, userId);
  
  // Note: In a multi-role system, you'd store roles in an array
  // For now, we'll just update the primary account type
  // You may want to implement a roles array in the User model
  user.accountType = newAccountType;
  await user.save();
  
  return {
    user: user.toJSON(),
    message: 'Account role extended successfully',
  };
};
