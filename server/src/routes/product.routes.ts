import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} from '../controllers/product.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/index.js';

export const productRouter = Router();

// ------------------------------------------------------------------------------
// Product Catalog Endpoints
// ------------------------------------------------------------------------------
productRouter.get('/', getProducts);
productRouter.get('/:id', getProductById);
productRouter.post(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  createProduct
);
productRouter.put(
  '/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  updateProduct
);
productRouter.delete(
  '/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  deleteProduct
);

// ------------------------------------------------------------------------------
// Product Variant Endpoints (Dynamic Surcharges)
// ------------------------------------------------------------------------------
productRouter.post(
  '/:id/variants',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  addVariant
);
productRouter.put(
  '/variants/:variantId',
  authenticateToken,
  requireRole([UserRole.ADMIN, UserRole.STAFF]),
  updateVariant
);
productRouter.delete(
  '/variants/:variantId',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  deleteVariant
);

// ------------------------------------------------------------------------------
// Subscription Plan Endpoints
// ------------------------------------------------------------------------------
export const planRouter = Router();

planRouter.get('/', getPlans);
planRouter.get('/:id', getPlanById);
planRouter.post(
  '/',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  createPlan
);
planRouter.put(
  '/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  updatePlan
);
planRouter.delete(
  '/:id',
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  deletePlan
);

