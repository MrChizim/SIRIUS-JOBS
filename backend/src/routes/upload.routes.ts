/**
 * Upload Routes
 * Handles file upload endpoints
 */

import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  uploadProfilePhoto as uploadProfilePhotoMiddleware,
  uploadBusinessImages as uploadBusinessImagesMiddleware,
  uploadLicenseDocument as uploadLicenseDocumentMiddleware,
  uploadJobAttachments as uploadJobAttachmentsMiddleware,
} from '../utils/upload.util';

const router = Router();

/**
 * @route   POST /api/upload/profile-photo
 * @desc    Upload profile photo
 * @access  Private
 */
router.post(
  '/profile-photo',
  authenticate,
  uploadProfilePhotoMiddleware,
  uploadController.uploadProfilePhoto
);

/**
 * @route   POST /api/upload/business-images
 * @desc    Upload business images (multiple)
 * @access  Private
 */
router.post(
  '/business-images',
  authenticate,
  uploadBusinessImagesMiddleware,
  uploadController.uploadBusinessImages
);

/**
 * @route   POST /api/upload/license-document
 * @desc    Upload license document
 * @access  Private
 */
router.post(
  '/license-document',
  authenticate,
  uploadLicenseDocumentMiddleware,
  uploadController.uploadLicenseDocument
);

/**
 * @route   POST /api/upload/job-attachments
 * @desc    Upload job attachments (multiple)
 * @access  Private
 */
router.post(
  '/job-attachments',
  authenticate,
  uploadJobAttachmentsMiddleware,
  uploadController.uploadJobAttachments
);

export default router;
