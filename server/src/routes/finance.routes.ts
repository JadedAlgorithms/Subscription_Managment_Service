import { Router } from 'express';
import { getFinanceMetrics } from '../controllers/finance.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/index.js';

export const financeRouter = Router();

financeRouter.use(authenticateToken);

financeRouter.get(
  '/metrics',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getFinanceMetrics
);

