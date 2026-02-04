/**
 * Upload Controller
 * Handles file upload endpoints
 */

import { Response } from 'express';
import path from 'path';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { getFileUrl } from '../utils/upload.util';

/**
 * Upload profile photo
 * POST /api/upload/profile-photo
 */
export const uploadProfilePhoto = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400);
  }

  const relativePath = path.relative(process.cwd(), req.file.path);
  const fileUrl = getFileUrl(relativePath);

  return sendSuccess(res, {
    filename: req.file.filename,
    path: relativePath,
    url: fileUrl,
    size: req.file.size,
    mimetype: req.file.mimetype,
  }, 'Profile photo uploaded successfully');
});

/**
 * Upload business images (multiple)
 * POST /api/upload/business-images
 */
export const uploadBusinessImages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return sendError(res, 'No files uploaded', 400);
  }

  const uploadedFiles = files.map(file => {
    const relativePath = path.relative(process.cwd(), file.path);
    return {
      filename: file.filename,
      path: relativePath,
      url: getFileUrl(relativePath),
      size: file.size,
      mimetype: file.mimetype,
    };
  });

  return sendSuccess(res, {
    files: uploadedFiles,
    count: uploadedFiles.length,
  }, `${uploadedFiles.length} business image(s) uploaded successfully`);
});

/**
 * Upload license document
 * POST /api/upload/license-document
 */
export const uploadLicenseDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400);
  }

  const relativePath = path.relative(process.cwd(), req.file.path);
  const fileUrl = getFileUrl(relativePath);

  return sendSuccess(res, {
    filename: req.file.filename,
    path: relativePath,
    url: fileUrl,
    size: req.file.size,
    mimetype: req.file.mimetype,
  }, 'License document uploaded successfully');
});

/**
 * Upload job attachments (multiple)
 * POST /api/upload/job-attachments
 */
export const uploadJobAttachments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return sendError(res, 'No files uploaded', 400);
  }

  const uploadedFiles = files.map(file => {
    const relativePath = path.relative(process.cwd(), file.path);
    return {
      filename: file.filename,
      path: relativePath,
      url: getFileUrl(relativePath),
      size: file.size,
      mimetype: file.mimetype,
    };
  });

  return sendSuccess(res, {
    files: uploadedFiles,
    count: uploadedFiles.length,
  }, `${uploadedFiles.length} attachment(s) uploaded successfully`);
});
