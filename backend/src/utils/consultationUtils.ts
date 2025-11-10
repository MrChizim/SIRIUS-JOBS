import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Generate anonymous client ID
 * Format: ANON-XXXXXX (6 random alphanumeric characters)
 */
export function generateAnonymousId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'ANON-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Generate client session token (JWT)
 * This allows clients to access their session without creating an account
 */
export function generateClientSessionToken(sessionId: string, clientAnonymousId: string): string {
  const payload = {
    sessionId,
    clientAnonymousId,
    type: 'client_session',
  };
  
  // Token expires in 25 hours (session is 24 hours + 1 hour buffer)
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '25h' });
}

/**
 * Verify client session token
 */
export function verifyClientSessionToken(token: string): { sessionId: string; clientAnonymousId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'client_session') {
      return null;
    }
    return {
      sessionId: decoded.sessionId,
      clientAnonymousId: decoded.clientAnonymousId,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate payment reference for Paystack
 */
export function generatePaymentReference(): string {
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CONSULT-${timestamp}-${randomHex}`;
}
