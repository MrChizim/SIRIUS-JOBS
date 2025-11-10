import winston from 'winston';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  }),
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'auth.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

// Audit logger for security events
export const auditLogger = {
  loginSuccess: (userId: string, email: string, ip?: string, userAgent?: string) => {
    logger.info('LOGIN_SUCCESS', {
      event: 'login_success',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  loginFailed: (email: string, reason: string, ip?: string, userAgent?: string) => {
    logger.warn('LOGIN_FAILED', {
      event: 'login_failed',
      email,
      reason,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  accountLocked: (userId: string, email: string, ip?: string) => {
    logger.warn('ACCOUNT_LOCKED', {
      event: 'account_locked',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  passwordResetRequested: (email: string, ip?: string) => {
    logger.info('PASSWORD_RESET_REQUESTED', {
      event: 'password_reset_requested',
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  passwordResetCompleted: (userId: string, email: string, ip?: string) => {
    logger.info('PASSWORD_RESET_COMPLETED', {
      event: 'password_reset_completed',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  registrationSuccess: (userId: string, email: string, role: string, ip?: string) => {
    logger.info('REGISTRATION_SUCCESS', {
      event: 'registration_success',
      userId,
      email,
      role,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  emailVerified: (userId: string, email: string) => {
    logger.info('EMAIL_VERIFIED', {
      event: 'email_verified',
      userId,
      email,
      timestamp: new Date().toISOString(),
    });
  },

  suspiciousActivity: (description: string, details: Record<string, any>) => {
    logger.warn('SUSPICIOUS_ACTIVITY', {
      event: 'suspicious_activity',
      description,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;
