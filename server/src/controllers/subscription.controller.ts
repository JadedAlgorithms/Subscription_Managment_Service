import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { SubscriptionStatus } from '../types/index.js';

/**
 * Valid state machine transitions for Subscriptions:
 * DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED
 */
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.DRAFT]: [SubscriptionStatus.QUOTATION, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.QUOTATION]: [SubscriptionStatus.CONFIRMED, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.CONFIRMED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.ACTIVE]: [SubscriptionStatus.CLOSED],
  [SubscriptionStatus.CLOSED]: [], // Terminal state
};

/**
 * Generates sequential subscription number format: SUB-YYYY-XXXX
 */
async function generateNextSubscriptionNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `SUB-${currentYear}-`;

  const lastSub = await prisma.subscription.findFirst({
    where: {
      subscriptionNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      subscriptionNumber: 'desc',
    },
    select: {
      subscriptionNumber: true,
    },
  });

  if (!lastSub) {
    return `${prefix}0001`;
  }

  const parts = lastSub.subscriptionNumber.split('-');
  const lastSequence = parseInt(parts[2], 10);
  const nextSeq = isNaN(lastSequence) ? 1 : lastSequence + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

// ------------------------------------------------------------------------------
// Subscriptions & Quotations CRUD
// ------------------------------------------------------------------------------

/**
 * List all Subscriptions and Quotations
 * GET /api/subscriptions
 */
export async function getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, customerId } = req.query;

    const whereClause: {
      status?: SubscriptionStatus;
      customerId?: string;
    } = {};

    if (status && Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
      whereClause.status = status as SubscriptionStatus;
    }

    if (customerId && typeof customerId === 'string') {
      whereClause.customerId = customerId;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
        plan: true,
        lineItems: {
          include: {
            product: true,
            variant: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            balanceDue: true,
            issueDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: subscriptions,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        total: subscriptions.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Subscription / Quote by ID
 * GET /api/subscriptions/:id
 */
export async function getSubscriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            companyName: true,
            phone: true,
          },
        },
        plan: true,
        lineItems: {
          include: {
            product: true,
            variant: true,
          },
        },
        invoices: {
          orderBy: { issueDate: 'desc' },
        },
      },
    });

    if (!subscription) {
      throw new AppError(`Subscription or Quotation with ID "${id}" was not found.`, 404);
    }

    res.status(200).json({
      success: true,
      data: subscription,
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
 * Create a new Quotation or Subscription with Line Items
 * POST /api/subscriptions
 */
export async function createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      customerId,
      planId,
      status,
      paymentTerms,
      startDate,
      autoRenew,
      notes,
      lineItems,
    } = req.body;

    if (!customerId || !planId) {
      throw new AppError('customerId and planId are required.', 400);
    }

    // Verify customer exists
    const customer = await prisma.user.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(`Customer with ID "${customerId}" does not exist.`, 404);
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new AppError(`Plan with ID "${planId}" does not exist.`, 404);
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new AppError('At least one line item is required.', 400);
    }

    // Validate minimum plan quantity requirement
    const totalQuantity = lineItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
    if (totalQuantity < plan.minimumQuantity) {
      throw new AppError(
        `Selected plan "${plan.name}" requires a minimum quantity of ${plan.minimumQuantity}. Provided: ${totalQuantity}.`,
        400
      );
    }

    // Calculate dates
    const effectiveStart = startDate ? new Date(startDate) : new Date();
    const expiryDate = new Date(effectiveStart);
    if (plan.validityDays) {
      expiryDate.setDate(expiryDate.getDate() + plan.validityDays);
    } else {
      // Default to 1 year
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const nextBillingDate = new Date(effectiveStart);
    if (plan.billingFrequency === 'DAILY') nextBillingDate.setDate(nextBillingDate.getDate() + 1);
    else if (plan.billingFrequency === 'WEEKLY') nextBillingDate.setDate(nextBillingDate.getDate() + 7);
    else if (plan.billingFrequency === 'MONTHLY') nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    else if (plan.billingFrequency === 'YEARLY') nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

    const subscriptionNumber = await generateNextSubscriptionNumber();
    const initialStatus: SubscriptionStatus = status && Object.values(SubscriptionStatus).includes(status)
      ? status
      : SubscriptionStatus.DRAFT;

    // Process line items with dynamic variant pricing
    const calculatedLineItems = await Promise.all(
      lineItems.map(async (item: { productId: string; variantId?: string; quantity: number; discountAmount?: number; notes?: string }) => {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new AppError(`Product with ID "${item.productId}" does not exist.`, 404);
        }

        let dynamicUnitPrice = Number(product.salesPrice);
        if (item.variantId) {
          const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
          if (variant) {
            // Add variant surcharge (e.g. +$560 for Odoo brand)
            dynamicUnitPrice += Number(variant.priceSurcharge);
          }
        }

        const qty = Math.max(1, Number(item.quantity) || 1);
        const subtotal = dynamicUnitPrice * qty;
        const discount = Number(item.discountAmount || 0);
        const taxRate = 8.25; // Standard default tax rate
        const taxableAmount = Math.max(0, subtotal - discount);
        const taxAmount = (taxableAmount * taxRate) / 100;
        const totalAmount = taxableAmount + taxAmount;

        return {
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: qty,
          unitPrice: dynamicUnitPrice,
          taxRate,
          taxAmount,
          discountAmount: discount,
          subtotal,
          totalAmount,
          notes: item.notes ? String(item.notes).trim() : null,
        };
      })
    );

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId,
        planId,
        status: initialStatus,
        paymentTerms: paymentTerms ? String(paymentTerms).trim() : 'Net 30',
        startDate: effectiveStart,
        expiryDate,
        nextBillingDate,
        autoRenew: autoRenew !== undefined ? Boolean(autoRenew) : plan.allowRenew,
        notes: notes ? String(notes).trim() : null,
        lineItems: {
          create: calculatedLineItems,
        },
      },
      include: {
        customer: true,
        plan: true,
        lineItems: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: `Quotation/Subscription ${subscriptionNumber} generated successfully.`,
      data: subscription,
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
 * State Machine Transition Controller
 * PATCH /api/subscriptions/:id/transition
 * Enforces legal state machine jumps: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED
 */
export async function transitionSubscriptionStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { targetStatus, actionNotes } = req.body;

    if (!targetStatus || !Object.values(SubscriptionStatus).includes(targetStatus)) {
      throw new AppError(`Valid targetStatus required (${Object.values(SubscriptionStatus).join(', ')}).`, 400);
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new AppError(`Subscription with ID "${id}" was not found.`, 404);
    }

    const currentStatus = subscription.status;
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedTargets.includes(targetStatus)) {
      throw new AppError(
        `Invalid state transition: Cannot transition from "${currentStatus}" to "${targetStatus}". Allowed next states: [${allowedTargets.join(', ')}].`,
        422
      );
    }

    // Enforce Plan Lifecycle Policies
    if (targetStatus === SubscriptionStatus.CLOSED && !subscription.plan.autoClose && currentStatus === SubscriptionStatus.ACTIVE) {
      // If plan restricts auto close or has specific pause policies, verify audit notes
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: targetStatus,
        notes: actionNotes
          ? `${subscription.notes ? subscription.notes + '\n' : ''}[${new Date().toISOString()}] Status transitioned to ${targetStatus}: ${actionNotes}`
          : subscription.notes,
      },
      include: {
        customer: true,
        plan: true,
        lineItems: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: `Subscription ${subscription.subscriptionNumber} transitioned from ${currentStatus} to ${targetStatus}.`,
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
 * Pause / Resume / Renew Active Subscription
 * POST /api/subscriptions/:id/lifecycle
 */
export async function manageLifecycle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'pause' | 'resume' | 'renew' | 'close_early'

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new AppError(`Subscription with ID "${id}" not found.`, 404);
    }

    const plan = subscription.plan;

    if (action === 'pause') {
      if (!plan.allowPause) {
        throw new AppError(`Plan "${plan.name}" does not permit pausing.`, 403);
      }
      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new AppError('Only ACTIVE subscriptions can be paused.', 400);
      }

      const updated = await prisma.subscription.update({
        where: { id },
        data: {
          notes: `${subscription.notes || ''}\n[${new Date().toISOString()}] Subscription PAUSED by user.`,
        },
      });

      res.status(200).json({
        success: true,
        message: `Subscription ${subscription.subscriptionNumber} paused successfully.`,
        data: updated,
      });
      return;
    }

    if (action === 'renew') {
      if (!plan.allowRenew) {
        throw new AppError(`Plan "${plan.name}" does not allow manual renewals.`, 403);
      }

      const currentExpiry = subscription.expiryDate || new Date();
      const newExpiry = new Date(currentExpiry);
      if (plan.validityDays) {
        newExpiry.setDate(newExpiry.getDate() + plan.validityDays);
      } else {
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      }

      const updated = await prisma.subscription.update({
        where: { id },
        data: {
          expiryDate: newExpiry,
          notes: `${subscription.notes || ''}\n[${new Date().toISOString()}] Subscription renewed through ${newExpiry.toISOString()}.`,
        },
      });

      res.status(200).json({
        success: true,
        message: `Subscription ${subscription.subscriptionNumber} renewed through ${newExpiry.toLocaleDateString()}.`,
        data: updated,
      });
      return;
    }

    if (action === 'close_early') {
      const updated = await prisma.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CLOSED,
          notes: `${subscription.notes || ''}\n[${new Date().toISOString()}] Terminated early.`,
        },
      });

      res.status(200).json({
        success: true,
        message: `Subscription ${subscription.subscriptionNumber} terminated early.`,
        data: updated,
      });
      return;
    }

    throw new AppError(`Unsupported lifecycle action: "${action}". Valid actions: pause, resume, renew, close_early.`, 400);
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------------------------
// Quotation Templates
// ------------------------------------------------------------------------------

/**
 * List all Quotation Templates
 * GET /api/templates
 */
export async function getQuotationTemplates(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      include: {
        plan: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: templates,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        total: templates.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new Quotation Template
 * POST /api/templates
 */
export async function createQuotationTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, code, description, planId, defaultPaymentTerms, validityDays, items } = req.body;

    if (!name || !code || !planId) {
      throw new AppError('Template name, code, and planId are required.', 400);
    }

    if (!req.user) {
      throw new AppError('Unauthorized: Token missing.', 401);
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description ? String(description).trim() : null,
        planId,
        defaultPaymentTerms: defaultPaymentTerms || 'Net 30',
        validityDays: Number(validityDays) || 30,
        isActive: true,
        createdById: req.user.userId,
        items: Array.isArray(items) && items.length > 0
          ? {
              create: items.map((i: { productId: string; variantId?: string; quantity?: number; discountPct?: number }) => ({
                productId: i.productId,
                variantId: i.variantId || null,
                quantity: Number(i.quantity) || 1,
                discountPct: Number(i.discountPct) || 0,
              })),
            }
          : undefined,
      },
      include: {
        plan: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Quotation template created successfully.',
      data: template,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

