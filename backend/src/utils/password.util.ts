/**
 * Password Utility Functions
 * Password validation and strength checking
 */

/**
 * Validate password requirements
 * Must contain at least one number and one special character
 * @param password - Password to validate
 * @returns Validation result with message
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  // Check for at least one number
  const hasNumber = /\d/.test(password);
  if (!hasNumber) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  // Check for at least one special character
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasSpecialChar) {
    return {
      valid: false,
      message: 'Password must contain at least one special character (!@#$%^&* etc.)',
    };
  }

  return { valid: true };
};

/**
 * Check password strength
 * @param password - Password to check
 * @returns Strength level (weak, medium, strong)
 */
export const checkPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let strength = 0;

  // Length check
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // Character variety checks
  if (/[a-z]/.test(password)) strength++; // Lowercase
  if (/[A-Z]/.test(password)) strength++; // Uppercase
  if (/\d/.test(password)) strength++; // Numbers
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++; // Special chars

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
};

/**
 * Generate a random password
 * @param length - Password length (default: 12)
 * @returns Random password meeting all requirements
 */
export const generateRandomPassword = (length: number = 12): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';
  
  const allChars = lowercase + uppercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each required type
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};
