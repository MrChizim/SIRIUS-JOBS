/**
 * Validation Utility Functions
 * Common validation helpers
 */

/**
 * Validate email format
 * @param email - Email to validate
 * @returns true if valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Nigerian format)
 * @param phone - Phone number to validate
 * @returns true if valid phone
 */
export const isValidPhone = (phone: string): boolean => {
  // Nigerian phone numbers: 080xxxxxxxx, 081xxxxxxxx, 070xxxxxxxx, +234xxxxxxxxxx
  const phoneRegex = /^(\+234|0)[7-9][0-1]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns true if valid URL
 */
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize user input (prevent XSS)
 * @param input - Input to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate MongoDB ObjectId
 * @param id - ID to validate
 * @returns true if valid ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  const objectIdRegex = /^[a-f\d]{24}$/i;
  return objectIdRegex.test(id);
};

/**
 * Validate file type
 * @param filename - File name
 * @param allowedTypes - Array of allowed extensions
 * @returns true if valid file type
 */
export const isValidFileType = (filename: string, allowedTypes: string[]): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
};

/**
 * Validate image file
 * @param filename - File name
 * @returns true if valid image
 */
export const isValidImage = (filename: string): boolean => {
  return isValidFileType(filename, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
};

/**
 * Validate document file (for government IDs)
 * @param filename - File name
 * @returns true if valid document
 */
export const isValidDocument = (filename: string): boolean => {
  return isValidFileType(filename, ['jpg', 'jpeg', 'png', 'pdf']);
};

/**
 * Validate date is in the future
 * @param date - Date to validate
 * @returns true if date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
  return date.getTime() > Date.now();
};

/**
 * Validate date is in the past
 * @param date - Date to validate
 * @returns true if date is in the past
 */
export const isPastDate = (date: Date): boolean => {
  return date.getTime() < Date.now();
};

/**
 * Validate rating (1-5)
 * @param rating - Rating to validate
 * @returns true if valid rating
 */
export const isValidRating = (rating: number): boolean => {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating);
};

/**
 * Validate Instagram handle
 * @param handle - Instagram handle
 * @returns true if valid
 */
export const isValidInstagram = (handle: string): boolean => {
  const instagramRegex = /^@?[a-zA-Z0-9._]{1,30}$/;
  return instagramRegex.test(handle);
};

/**
 * Validate WhatsApp number
 * @param whatsapp - WhatsApp number
 * @returns true if valid
 */
export const isValidWhatsApp = (whatsapp: string): boolean => {
  return isValidPhone(whatsapp);
};

/**
 * Validate amount (positive number)
 * @param amount - Amount to validate
 * @returns true if valid amount
 */
export const isValidAmount = (amount: number): boolean => {
  return typeof amount === 'number' && amount > 0 && !isNaN(amount);
};
