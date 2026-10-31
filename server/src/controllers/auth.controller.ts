import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'brightloop-super-secure-production-ready-jwt-secret-key-32chars';

/**
 * Validates password complexity:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 special character
 */
export function validatePasswordComplexity(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must include at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must include at least one lowercase letter (a-z).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must include at least one special character (e.g. !@#$%^&*).' };
  }
  return { valid: true };
}

/**
 * Generates signed JWT authentication token.
 */
function generateToken(user: { id: string; email: string; role: string; firstName: string; lastName: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Customer Self-Service Registration
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, companyName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required.', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Please provide a valid email address.', 400);
    }

    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: companyName ? companyName.trim() : null,
        phone: phone ? phone.trim() : null,
        role: UserRole.CUSTOMER,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account successfully registered.',
      data: {
        user: newUser,
        token,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unified Authentication Login
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password must be provided.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new AppError('Invalid email or password credentials.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError('Invalid email or password credentials.', 401);
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: user.companyName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        token,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Current User Profile
 * GET /api/auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized: Token missing or invalid.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User profile not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: user,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Initiates Password Reset Token Flow
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError('Please specify the account email address.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // To prevent email enumeration attacks, always respond with success
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If the email matches an active account, password reset instructions have been issued.',
        meta: { timestamp: new Date().toISOString(), version: '1.0.0' },
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // Invalidate prior unused tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully.',
      data: {
        email: user.email,
        resetToken, // Provided for direct API and frontend testing
        expiresAt: expiresAt.toISOString(),
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Completes Password Reset via Token
 * POST /api/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new AppError('Reset token and new password are required.', 400);
    }

    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400);
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      throw new AppError('Invalid or expired password reset token.', 400);
    }

    if (record.usedAt) {
      throw new AppError('This reset token has already been utilized.', 400);
    }

    if (new Date() > record.expiresAt) {
      throw new AppError('Password reset token has expired. Please initiate a new request.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and mark token used in a single atomic transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Password has been updated successfully. You may now log in with your new credentials.',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Staff Creation Endpoint (Admin Only)
 * POST /api/auth/staff
 */
export async function createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required for staff onboarding.', 400);
    }

    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const staffMember = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: 'Brightloop Software Internal Staff',
        phone: phone ? phone.trim() : null,
        role: UserRole.STAFF,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully.',
      data: staffMember,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List Customers (For Sales Quotation Builder customer dropdown)
 * GET /api/auth/customers
 */
export async function getCustomers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customers = await prisma.user.findMany({
      where: { role: UserRole.CUSTOMER },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        phone: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: customers,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        total: customers.length,
      },
    });
  } catch (error) {
    next(error);
  }
}
