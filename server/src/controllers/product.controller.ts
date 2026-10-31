import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { ProductType, BillingFrequency } from '../types/index.js';

// ------------------------------------------------------------------------------
// Product Catalog Controllers
// ------------------------------------------------------------------------------

/**
 * List all Products including their configured Variants
 * GET /api/products
 */
export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, activeOnly } = req.query;

    const whereClause: {
      type?: ProductType;
      isActive?: boolean;
    } = {};

    if (type && Object.values(ProductType).includes(type as ProductType)) {
      whereClause.type = type as ProductType;
    }

    if (activeOnly === 'true') {
      whereClause.isActive = true;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        variants: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: products,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        total: products.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Product by ID
 * GET /api/products/:id
 */
export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    });

    if (!product) {
      throw new AppError(`Product with ID "${id}" was not found.`, 404);
    }

    res.status(200).json({
      success: true,
      data: product,
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
 * Create a new Product (optionally with Variants)
 * POST /api/products
 */
export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, code, type, salesPrice, costPrice, notes, variants } = req.body;

    if (!name || !code || salesPrice === undefined || costPrice === undefined) {
      throw new AppError('Product name, unique code, salesPrice, and costPrice are required.', 400);
    }

    const existingCode = await prisma.product.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existingCode) {
      throw new AppError(`A product with code "${code}" already exists.`, 409);
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type: (type as ProductType) || ProductType.SOFTWARE,
        salesPrice: Number(salesPrice),
        costPrice: Number(costPrice),
        notes: notes ? String(notes).trim() : null,
        isActive: true,
        variants: Array.isArray(variants) && variants.length > 0
          ? {
              create: variants.map((v: { name: string; sku: string; priceSurcharge?: number; notes?: string }) => ({
                name: v.name.trim(),
                sku: v.sku.trim().toUpperCase(),
                priceSurcharge: Number(v.priceSurcharge || 0),
                notes: v.notes ? String(v.notes).trim() : null,
                isActive: true,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product,
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
 * Update a Product
 * PUT /api/products/:id
 */
export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, type, salesPrice, costPrice, notes, isActive } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      throw new AppError(`Product with ID "${id}" does not exist.`, 404);
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        type: type !== undefined ? (type as ProductType) : undefined,
        salesPrice: salesPrice !== undefined ? Number(salesPrice) : undefined,
        costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
        notes: notes !== undefined ? String(notes).trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      include: {
        variants: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: updatedProduct,
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
 * Delete a Product
 * DELETE /api/products/:id
 */
export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Product with ID "${id}" does not exist.`, 404);
    }

    await prisma.product.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Product "${existing.name}" has been deleted.`,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------------------------
// Product Variant Controllers (Dynamic Pricing Modifiers)
// ------------------------------------------------------------------------------

/**
 * Add a Variant with Dynamic Price Surcharge to an existing Product
 * POST /api/products/:id/variants
 */
export async function addVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, sku, priceSurcharge, notes } = req.body;

    if (!name || !sku) {
      throw new AppError('Variant name and unique SKU are required.', 400);
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError(`Parent product with ID "${id}" not found.`, 404);
    }

    const existingSku = await prisma.productVariant.findUnique({
      where: { sku: sku.trim().toUpperCase() },
    });
    if (existingSku) {
      throw new AppError(`SKU "${sku}" is already assigned to another variant.`, 409);
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        priceSurcharge: Number(priceSurcharge || 0),
        notes: notes ? String(notes).trim() : null,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product variant added successfully.',
      data: variant,
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
 * Update an existing Product Variant
 * PUT /api/products/variants/:variantId
 */
export async function updateVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { variantId } = req.params;
    const { name, priceSurcharge, notes, isActive } = req.body;

    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) {
      throw new AppError(`Variant with ID "${variantId}" not found.`, 404);
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        priceSurcharge: priceSurcharge !== undefined ? Number(priceSurcharge) : undefined,
        notes: notes !== undefined ? String(notes).trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Product variant updated successfully.',
      data: updated,
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
 * Delete a Product Variant
 * DELETE /api/products/variants/:variantId
 */
export async function deleteVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { variantId } = req.params;

    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) {
      throw new AppError(`Variant with ID "${variantId}" not found.`, 404);
    }

    await prisma.productVariant.delete({ where: { id: variantId } });

    res.status(200).json({
      success: true,
      message: `Variant "${existing.name}" deleted.`,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------------------------
// Subscription Plan Controllers (Cadence & Lifecycle Rules)
// ------------------------------------------------------------------------------

/**
 * List all Subscription Plans
 * GET /api/plans
 */
export async function getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { frequency, activeOnly } = req.query;

    const whereClause: {
      billingFrequency?: BillingFrequency;
      isActive?: boolean;
    } = {};

    if (frequency && Object.values(BillingFrequency).includes(frequency as BillingFrequency)) {
      whereClause.billingFrequency = frequency as BillingFrequency;
    }

    if (activeOnly === 'true') {
      whereClause.isActive = true;
    }

    const plans = await prisma.plan.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: plans,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        total: plans.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Plan by ID
 * GET /api/plans/:id
 */
export async function getPlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const plan = await prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new AppError(`Subscription plan with ID "${id}" was not found.`, 404);
    }

    res.status(200).json({
      success: true,
      data: plan,
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
 * Create a new Subscription Plan
 * POST /api/plans
 */
export async function createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name,
      code,
      description,
      billingFrequency,
      minimumQuantity,
      validityDays,
      startDate,
      endDate,
      autoClose,
      allowPause,
      allowRenew,
      price,
      currency,
    } = req.body;

    if (!name || !code || !billingFrequency || price === undefined) {
      throw new AppError('Plan name, unique code, billingFrequency, and price are required.', 400);
    }

    const existingCode = await prisma.plan.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existingCode) {
      throw new AppError(`A plan with code "${code}" already exists.`, 409);
    }

    const plan = await prisma.plan.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description ? String(description).trim() : null,
        billingFrequency: billingFrequency as BillingFrequency,
        minimumQuantity: minimumQuantity !== undefined ? Math.max(1, Number(minimumQuantity)) : 1,
        validityDays: validityDays ? Number(validityDays) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        autoClose: Boolean(autoClose ?? false),
        allowPause: Boolean(allowPause ?? true),
        allowRenew: Boolean(allowRenew ?? true),
        price: Number(price),
        currency: currency ? String(currency).trim().toUpperCase() : 'USD',
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully.',
      data: plan,
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
 * Update a Subscription Plan
 * PUT /api/plans/:id
 */
export async function updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      billingFrequency,
      minimumQuantity,
      validityDays,
      startDate,
      endDate,
      autoClose,
      allowPause,
      allowRenew,
      price,
      currency,
      isActive,
    } = req.body;

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Subscription plan with ID "${id}" does not exist.`, 404);
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        description: description !== undefined ? String(description).trim() : undefined,
        billingFrequency: billingFrequency ? (billingFrequency as BillingFrequency) : undefined,
        minimumQuantity: minimumQuantity !== undefined ? Math.max(1, Number(minimumQuantity)) : undefined,
        validityDays: validityDays !== undefined ? (validityDays ? Number(validityDays) : null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        autoClose: autoClose !== undefined ? Boolean(autoClose) : undefined,
        allowPause: allowPause !== undefined ? Boolean(allowPause) : undefined,
        allowRenew: allowRenew !== undefined ? Boolean(allowRenew) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        currency: currency !== undefined ? String(currency).trim().toUpperCase() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully.',
      data: updated,
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
 * Delete a Subscription Plan
 * DELETE /api/plans/:id
 */
export async function deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Subscription plan with ID "${id}" does not exist.`, 404);
    }

    await prisma.plan.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Plan "${existing.name}" deleted.`,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

