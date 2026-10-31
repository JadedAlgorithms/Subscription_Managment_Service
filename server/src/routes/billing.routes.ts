import { Router } from 'express';
import {
  triggerManualBillingRun,
  getInvoices,
  getInvoiceById,
  confirmInvoice,
  cancelInvoice,
  sendInvoice,
  getDiscountRules,
  createDiscount,
  toggleDiscountStatus,
  getTaxRules,
  createTaxRule,
} from '../controllers/billing.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/index.js';

export const billingRouter = Router();

billingRouter.use(authenticateToken);

// ------------------------------------------------------------------------------
// Billing Runs
// ------------------------------------------------------------------------------
billingRouter.post(
  '/trigger-run',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  triggerManualBillingRun
);

// ------------------------------------------------------------------------------
// Invoices
// ------------------------------------------------------------------------------
billingRouter.get(
  '/invoices',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getInvoices
);

billingRouter.get(
  '/invoices/:id',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getInvoiceById
);

billingRouter.post(
  '/invoices/:id/confirm',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  confirmInvoice
);

billingRouter.post(
  '/invoices/:id/cancel',
  requireRole([UserRole.ADMIN]),
  cancelInvoice
);

billingRouter.post(
  '/invoices/:id/send',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  sendInvoice
);

// ------------------------------------------------------------------------------
// Discounts (Role-restricted to ADMIN for creation)
// ------------------------------------------------------------------------------
billingRouter.get(
  '/discounts',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getDiscountRules
);

billingRouter.post(
  '/discounts',
  requireRole([UserRole.ADMIN]),
  createDiscount
);

billingRouter.patch(
  '/discounts/:id/toggle',
  requireRole([UserRole.ADMIN]),
  toggleDiscountStatus
);

// ------------------------------------------------------------------------------
// Tax Rules
// ------------------------------------------------------------------------------
billingRouter.get(
  '/taxes',
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  getTaxRules
);

billingRouter.post(
  '/taxes',
  requireRole([UserRole.ADMIN]),
  createTaxRule
);

