import { Router } from 'express';
import {
  recordPayment,
  getPayments,
  getReceivablesBreakdown,
} from '../controllers/payment.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/index.js';

export const paymentRouter = Router();

paymentRouter.use(authenticateToken);

paymentRouter.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER]),
  recordPayment
);

paymentRouter.get(
  '/',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getPayments
);

paymentRouter.get(
  '/receivables',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getReceivablesBreakdown
);

