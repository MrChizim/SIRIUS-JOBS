import xss from 'xss';
import validator from 'validator';

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return xss(input.trim());
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!validator.isEmail(trimmed)) return null;
  return sanitizeInput(trimmed);
}

/**
 * Validate and sanitize name (first name, last name, etc.)
 */
export function sanitizeName(name: string): string | null {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();

  // Name should only contain letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) return null;

  // Name should be between 2 and 50 characters
  if (trimmed.length < 2 || trimmed.length > 50) return null;

  return sanitizeInput(trimmed);
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Nigerian phone numbers should be 10-11 digits
  if (digits.length < 10 || digits.length > 11) return null;

  return digits;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  return { valid: true };
}

/**
 * Sanitize text content (for descriptions, messages, etc.)
 */
export function sanitizeText(text: string, maxLength: number = 5000): string | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) return null;

  return sanitizeInput(trimmed);
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  if (!validator.isURL(trimmed, { require_protocol: true })) return null;

  return sanitizeInput(trimmed);
}
