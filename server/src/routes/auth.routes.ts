import { Router } from 'express';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  createStaff,
  getCustomers,
} from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/index.js';

export const authRouter = Router();

// Public Authentication Endpoints
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

// Authenticated User Endpoints
authRouter.get('/me', authenticateToken, getMe);

// Admin-Restricted Staff Onboarding
authRouter.post(
  '/staff',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  createStaff
);

// Internal Staff & Admin Customer Directory (for Quotation / Subscription builder)
authRouter.get(
  '/customers',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getCustomers
);

