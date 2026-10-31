import { Router } from 'express';
import {
  getCustomerSubscriptions,
  getCustomerInvoices,
  getCustomerInvoiceById,
} from '../controllers/portal.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

export const portalRouter = Router();

// All Customer Portal endpoints require valid token and are scoped to the user ID
portalRouter.use(authenticateToken);

portalRouter.get('/subscriptions', getCustomerSubscriptions);
portalRouter.get('/invoices', getCustomerInvoices);
portalRouter.get('/invoices/:id', getCustomerInvoiceById);

