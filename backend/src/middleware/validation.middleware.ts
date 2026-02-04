/**
 * Validation Middleware
 * Request body validation using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendValidationError } from '../utils/response.util';

/**
 * Validate request body against Zod schema
 * @param schema - Zod schema to validate against
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        sendValidationError(res, errors);
      } else {
        sendValidationError(res, [{ message: 'Validation failed' }]);
      }
    }
  };
};

/**
 * Validate request query parameters
 * @param schema - Zod schema to validate against
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        sendValidationError(res, errors);
      } else {
        sendValidationError(res, [{ message: 'Query validation failed' }]);
      }
    }
  };
};

/**
 * Validate request params
 * @param schema - Zod schema to validate against
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        sendValidationError(res, errors);
      } else {
        sendValidationError(res, [{ message: 'Parameter validation failed' }]);
      }
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // MongoDB ObjectId
  objectId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),

  // Email
  email: z.string().email('Invalid email address'),

  // Password with requirements
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      'Password must contain at least one special character'
    ),

  // Phone number
  phone: z.string().regex(/^(\+234|0)[7-9][0-1]\d{8}$/, 'Invalid phone number'),

  // Rating (1-5)
  rating: z.number().int().min(1).max(5),

  // URL
  url: z.string().url('Invalid URL'),

  // Pagination
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  }),
};
