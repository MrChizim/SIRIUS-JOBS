/**
 * Authentication Middleware
 * Protect routes and verify JWT tokens
 */

import type { Request, Response, NextFunction } from 'express';
import type { AccountType } from '../types';
import { verifyAccessToken } from '../utils/jwt.util';
import { sendUnauthorized, sendForbidden } from '../utils/response.util';

/**
 * Extended Request type with user data
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    accountType: AccountType;
  };
}

/**
 * Authenticate user - verify JWT token
 * Adds user data to request object
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendUnauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);

    // Attach user data to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      accountType: decoded.accountType,
    };

    next();
  } catch (error: any) {
    sendUnauthorized(res, error.message || 'Invalid token');
  }
};

/**
 * Authorize user by account type
 * Use this after authenticate middleware
 * @param allowedTypes - Array of allowed account types
 */
export const authorize = (...allowedTypes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    if (!allowedTypes.includes(req.user.accountType)) {
      sendForbidden(res, 'You do not have permission to access this resource');
      return;
    }

    next();
  };
};

/**
 * Optional authentication - don't fail if no token
 * Useful for routes that work with or without auth
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        accountType: decoded.accountType,
      };
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user data
    next();
  }
};

/**
 * Check if user owns the resource
 * Compare userId from token with userId from params
 */
export const checkOwnership = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendUnauthorized(res, 'Authentication required');
    return;
  }

  const resourceUserId = req.params.userId || req.params.id;

  if (req.user.userId !== resourceUserId) {
    sendForbidden(res, 'You can only access your own resources');
    return;
  }

  next();
};
