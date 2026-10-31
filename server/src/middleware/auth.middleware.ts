import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { UserRole } from '../types/index.js';
import { AppError } from './errorHandler.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'brightloop-super-secure-production-ready-jwt-secret-key-32chars';

/**
 * Middleware to authenticate JWT bearer tokens.
 * Extracts Bearer token, validates signature and expiration, and attaches user payload.
 */
export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authentication token malformed.', 401);
    }

    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new AppError('Authentication session has expired. Please log in again.', 401);
      }
      throw new AppError('Invalid authentication token signature.', 401);
    }

    // Verify user exists and is active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401);
    }

    if (!user.isActive) {
      throw new AppError('User account is currently deactivated. Contact administration.', 403);
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Restricts access strictly to users possessing one of the allowed roles.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Unauthorized: User context missing from request.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Insufficient privileges. Required role: [${allowedRoles.join(', ')}]. Current role: [${req.user.role}].`,
          403
        )
      );
    }

    next();
  };
}

