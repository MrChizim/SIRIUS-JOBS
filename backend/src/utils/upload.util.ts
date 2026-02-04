/**
 * File Upload Utility
 * Handles file uploads using multer with validation
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const profilePhotosDir = path.join(uploadDir, 'profile-photos');
const businessImagesDir = path.join(uploadDir, 'business-images');
const licenseDocsDir = path.join(uploadDir, 'license-documents');
const jobAttachmentsDir = path.join(uploadDir, 'job-attachments');

// Create directories if they don't exist
[uploadDir, profilePhotosDir, businessImagesDir, licenseDocsDir, jobAttachmentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destination = uploadDir;

    // Determine destination based on field name
    if (file.fieldname === 'profilePhoto') {
      destination = profilePhotosDir;
    } else if (file.fieldname === 'businessImages') {
      destination = businessImagesDir;
    } else if (file.fieldname === 'licenseDocument') {
      destination = licenseDocsDir;
    } else if (file.fieldname === 'attachments') {
      destination = jobAttachmentsDir;
    }

    cb(null, destination);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

// File filter for images
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// File filter for documents
const documentFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, images, and Word documents are allowed.'));
  }
};

// Max file size from env or default to 5MB
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10);

// Multer configurations
export const uploadProfilePhoto = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: maxFileSize,
  },
}).single('profilePhoto');

export const uploadBusinessImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: maxFileSize,
    files: 10, // Max 10 images
  },
}).array('businessImages', 10);

export const uploadLicenseDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: maxFileSize * 2, // Allow larger files for documents (10MB)
  },
}).single('licenseDocument');

export const uploadJobAttachments = multer({
  storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: maxFileSize,
    files: 5, // Max 5 attachments
  },
}).array('attachments', 5);

/**
 * Delete a file from the uploads directory
 */
export const deleteFile = (filePath: string): void => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

/**
 * Get public URL for uploaded file
 */
export const getFileUrl = (filePath: string): string => {
  const baseUrl = process.env.API_URL || 'http://localhost:4000';
  return `${baseUrl}/uploads/${filePath.replace(/\\/g, '/')}`;
};
