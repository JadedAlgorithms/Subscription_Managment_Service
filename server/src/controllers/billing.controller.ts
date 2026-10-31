import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { runBillingCycle } from '../services/billing.service.js';
import { createDiscountRule } from '../services/discount.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { InvoiceStatus, DiscountType, DiscountScope } from '../types/index.js';

// ------------------------------------------------------------------------------
// Billing Runner Endpoints
// ------------------------------------------------------------------------------

/**
 * Manually trigger billing run (for on-demand runs and test evaluation)
 * POST /api/billing/trigger-run
 */
export async function triggerManualBillingRun(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await runBillingCycle();

    res.status(200).json({
      success: true,
      message: `Billing run executed: ${summary.invoicesCreated} created, ${summary.skippedDuplicates} skipped (idempotent), ${summary.failedCount} failed.`,
      data: summary,
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
// Invoice Lifecycle & Ledger Endpoints
// ------------------------------------------------------------------------------

/**
 * List Invoices with filter support (all, draft, confirmed, paid, overdue)
 * GET /api/billing/invoices
 */
export async function getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, customerId, search } = req.query;
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (customerId) {
      where.customerId = String(customerId);
    }

    if (status === 'OVERDUE') {
      where.status = { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.DRAFT] };
      where.dueDate = { lt: now };
    } else if (status && Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
      where.status = status as InvoiceStatus;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search), mode: 'insensitive' } },
        { customer: { companyName: { contains: String(search), mode: 'insensitive' } } },
        { customer: { email: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
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
        subscription: {
          select: {
            id: true,
            subscriptionNumber: true,
            plan: { select: { name: true, billingFrequency: true } },
          },
        },
        payments: true,
        lineItems: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: invoices,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        total: invoices.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Invoice detail with line items and payments
 * GET /api/billing/invoices/:id
 */
export async function getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: { plan: true },
        },
        lineItems: true,
        payments: {
          include: {
            recordedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError(`Invoice with ID "${id}" was not found.`, 404);
    }

    res.status(200).json({
      success: true,
      data: invoice,
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
 * Transition Invoice: DRAFT -> CONFIRMED
 * POST /api/billing/invoices/:id/confirm
 */
export async function confirmInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new AppError(`Invoice "${id}" not found.`, 404);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new AppError(`Cannot confirm invoice in status "${invoice.status}".`, 400);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CONFIRMED },
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} has been confirmed.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel Invoice (Safeguarded against double-billing or paid invoices)
 * POST /api/billing/invoices/:id/cancel
 */
export async function cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) throw new AppError(`Invoice "${id}" not found.`, 404);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError('Cannot cancel an invoice that has already been PAID. Issue a credit note or refund.', 400);
    }

    if (invoice.payments.length > 0) {
      throw new AppError('Cannot cancel an invoice with existing recorded payments.', 400);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        notes: `${invoice.notes || ''}\n[${new Date().toISOString()}] Cancelled: ${reason || 'Administrative cancellation.'}`,
      },
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} has been cancelled.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Send / Mock Dispatch Invoice to Customer via Email
 * POST /api/billing/invoices/:id/send
 */
export async function sendInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!invoice) throw new AppError(`Invoice "${id}" not found.`, 404);

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        notes: `${invoice.notes || ''}\n[${new Date().toISOString()}] Invoice dispatched electronically to ${invoice.customer.email}.`,
      },
    });

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} sent to ${invoice.customer.email}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------------------------
// Discount Rules Management (Admin Only)
// ------------------------------------------------------------------------------

/**
 * List all discount rules
 * GET /api/billing/discounts
 */
export async function getDiscountRules(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rules = await prisma.discountRule.findMany({
      include: {
        targetProduct: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: rules,
      meta: { timestamp: new Date().toISOString(), version: '1.0.0', total: rules.length },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new discount rule
 * POST /api/billing/discounts
 */
export async function createDiscount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      code,
      description,
      type,
      value,
      scope,
      targetProductId,
      minPurchaseAmount,
      minQuantity,
      maxUsage,
      startDate,
      endDate,
    } = req.body;

    if (!code || !type || value === undefined) {
      throw new AppError('Discount code, type, and numeric value are required.', 400);
    }

    if (!req.user) throw new AppError('Unauthorized.', 401);

    const discount = await createDiscountRule(
      {
        code,
        description,
        type: type as DiscountType,
        value: Number(value),
        scope: (scope as DiscountScope) || DiscountScope.SUBSCRIPTION,
        targetProductId: targetProductId || undefined,
        minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : undefined,
        minQuantity: minQuantity ? Number(minQuantity) : undefined,
        maxUsage: maxUsage ? Number(maxUsage) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
      req.user.userId
    );

    res.status(201).json({
      success: true,
      message: `Discount rule "${discount.code}" created successfully.`,
      data: discount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle Discount rule active status
 * PATCH /api/billing/discounts/:id/toggle
 */
export async function toggleDiscountStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const rule = await prisma.discountRule.findUnique({ where: { id } });
    if (!rule) throw new AppError(`Discount rule "${id}" not found.`, 404);

    const updated = await prisma.discountRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });

    res.status(200).json({
      success: true,
      message: `Discount rule "${rule.code}" is now ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------------------------
// Tax Rules Management
// ------------------------------------------------------------------------------

/**
 * List tax rules
 * GET /api/billing/taxes
 */
export async function getTaxRules(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rules = await prisma.taxRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a Tax Rule (Admin only)
 * POST /api/billing/taxes
 */
export async function createTaxRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, rate, isDefault } = req.body;
    if (!name || rate === undefined) {
      throw new AppError('Tax rule name and rate percentage are required.', 400);
    }

    if (!req.user) throw new AppError('Unauthorized.', 401);

    if (isDefault) {
      // Clear previous default
      await prisma.taxRule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const taxRule = await prisma.taxRule.create({
      data: {
        name: name.trim(),
        rate: Number(rate),
        isDefault: Boolean(isDefault),
        isActive: true,
        createdById: req.user.userId,
      },
    });

    res.status(201).json({
      success: true,
      message: `Tax rule "${taxRule.name}" created.`,
      data: taxRule,
    });
  } catch (error) {
    next(error);
  }
}

