/**
 * Response Utility Functions
 * Standardized API response format
 */

import { Response } from 'express';
import { IAPIResponse } from '../types';

/**
 * Send success response
 * @param res - Express response object
 * @param data - Response data
 * @param message - Success message
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: IAPIResponse<T> = {
    success: true,
    message,
    data,
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param res - Express response object
 * @param error - Error message
 * @param statusCode - HTTP status code (default: 400)
 * @param errors - Additional error details
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 400,
  errors?: any[]
): Response => {
  const response: IAPIResponse = {
    success: false,
    error,
    errors,
  };

  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * @param res - Express response object
 * @param data - Created resource data
 * @param message - Success message
 */
export const sendCreated = <T>(
  res: Response,
  data?: T,
  message: string = 'Resource created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send no content response (204)
 * @param res - Express response object
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Send unauthorized response (401)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized access'
): Response => {
  return sendError(res, message, 401);
};

/**
 * Send forbidden response (403)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Access forbidden'
): Response => {
  return sendError(res, message, 403);
};

/**
 * Send not found response (404)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return sendError(res, message, 404);
};

/**
 * Send conflict response (409)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendConflict = (
  res: Response,
  message: string = 'Resource already exists'
): Response => {
  return sendError(res, message, 409);
};

/**
 * Send validation error response (422)
 * @param res - Express response object
 * @param errors - Validation errors
 */
export const sendValidationError = (
  res: Response,
  errors: any[]
): Response => {
  return sendError(res, 'Validation failed', 422, errors);
};

/**
 * Send internal server error response (500)
 * @param res - Express response object
 * @param message - Error message
 */
export const sendServerError = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return sendError(res, message, 500);
};
