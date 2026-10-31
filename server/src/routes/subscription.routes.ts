import { Router } from 'express';
import {
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  transitionSubscriptionStatus,
  manageLifecycle,
  getQuotationTemplates,
  createQuotationTemplate,
} from '../controllers/subscription.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/index.js';

export const subscriptionRouter = Router();

// Subscriptions & Quotations Core Endpoints
subscriptionRouter.get(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getSubscriptions
);

subscriptionRouter.get('/:id', authenticateToken, getSubscriptionById);

subscriptionRouter.post(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  createSubscription
);

subscriptionRouter.patch(
  '/:id/transition',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  transitionSubscriptionStatus
);

subscriptionRouter.post(
  '/:id/lifecycle',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  manageLifecycle
);

// Quotation Templates
export const templateRouter = Router();

templateRouter.get('/', authenticateToken, getQuotationTemplates);
templateRouter.post(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  createQuotationTemplate
);

