import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me';

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string; // ID from PostgreSQL
    id: string;
    role: string;
    roles?: string[]; // Array of roles
    email: string;
    firstName?: string;
    lastName?: string;
  };
};

export function requireAuth(requiredRoles?: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Session expired' });
    }

    const token = header.slice(7).trim();
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        role?: string;
        roles?: string[];
        email: string;
      };

      const role = decoded.role || decoded.roles?.[0] || 'user';

      req.user = {
        id: decoded.sub,
        role,
        roles: decoded.roles,
        email: decoded.email,
      };

      if (requiredRoles && !requiredRoles.includes(role)) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Session expired' });
    }
  };
}

// Professional authentication middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.user = {
      userId: decoded.userId || decoded.sub,
      id: decoded.userId || decoded.sub,
      role: decoded.role,
      roles: decoded.roles || [decoded.role],
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export type { AuthenticatedRequest };
