/**
 * JWT Utility Functions
 * Handle JWT token generation and verification with refresh tokens
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { IJWTPayload } from '../types';

/**
 * Generate access token (short-lived: 15 minutes)
 * @param payload - Token payload containing user data
 * @returns JWT access token
 */
export const generateAccessToken = (payload: IJWTPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
};

/**
 * Generate refresh token (long-lived: 7 days)
 * @param payload - Token payload containing user data
 * @returns JWT refresh token
 */
export const generateRefreshToken = (payload: IJWTPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
  } as jwt.SignOptions);
};

/**
 * Verify access token
 * @param token - JWT access token
 * @returns Decoded token payload
 */
export const verifyAccessToken = (token: string): IJWTPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as IJWTPayload;
  } catch (error: any) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 * @param token - JWT refresh token
 * @returns Decoded token payload
 */
export const verifyRefreshToken = (token: string): IJWTPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as IJWTPayload;
  } catch (error: any) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Generate both access and refresh tokens
 * @param userId - User ID
 * @param email - User email
 * @param accountType - User account type
 * @returns Object containing both tokens
 */
export const generateTokenPair = (
  userId: string,
  email: string,
  accountType: string
) => {
  const payload: IJWTPayload = {
    userId,
    email,
    accountType: accountType as any,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Decode token without verification (useful for debugging)
 * @param token - JWT token
 * @returns Decoded token payload
 */
export const decodeToken = (token: string): IJWTPayload | null => {
  try {
    return jwt.decode(token) as IJWTPayload;
  } catch (error) {
    return null;
  }
};
