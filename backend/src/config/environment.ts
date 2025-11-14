/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variables interface
 */
interface IEnvironment {
  NODE_ENV: string;
  PORT: number;

  // Database
  MONGODB_URI: string;
  POSTGRES_URI?: string;

  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Paystack (Payment Gateway)
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_PUBLIC_KEY: string;

  // Google OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // Frontend URL
  FRONTEND_URL: string;

  // File Upload
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;

  // Email (optional for future)
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
}

/**
 * Load and validate environment variables
 */
const loadEnvironment = (): IEnvironment => {
  const env: IEnvironment = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '4000', 10),

    // Database
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/sirius_jobs',
    POSTGRES_URI: process.env.POSTGRES_URI,

    // JWT - IMPORTANT: Change these in production!
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m', // 15 minutes
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7 days

    // Paystack
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder', // YOU WILL ADD YOUR KEY
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder', // YOU WILL ADD YOUR KEY

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    // Frontend
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5500',

    // File Upload
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default

    // Email (optional)
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
  };

  // Validate critical environment variables
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET === 'your-secret-key-change-in-production') {
      throw new Error('❌ CRITICAL: JWT_SECRET must be set in production!');
    }

    if (env.PAYSTACK_SECRET_KEY === 'sk_test_placeholder') {
      console.warn('⚠️  WARNING: PAYSTACK_SECRET_KEY is using placeholder value');
    }
  }

  return env;
};

export const env = loadEnvironment();

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return env.NODE_ENV === 'production';
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return env.NODE_ENV === 'development';
};

/**
 * Check if running in test
 */
export const isTest = (): boolean => {
  return env.NODE_ENV === 'test';
};
