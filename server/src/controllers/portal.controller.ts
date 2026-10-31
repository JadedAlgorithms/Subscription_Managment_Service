import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Customer Self-Service Portal Controllers
 * Strictly scoped to the authenticated customer ID.
 */

/**
 * Get Subscriptions belonging strictly to the logged-in Customer
 * GET /api/portal/subscriptions
 */
export async function getCustomerSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized: Token missing.', 401);
    }

    const customerId = req.user.userId;

    const subscriptions = await prisma.subscription.findMany({
      where: { customerId },
      include: {
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
            dueDate: true,
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
 * Get Invoices belonging strictly to the logged-in Customer
 * GET /api/portal/invoices
 */
export async function getCustomerInvoices(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized: Token missing.', 401);
    }

    const customerId = req.user.userId;

    const invoices = await prisma.invoice.findMany({
      where: { customerId },
      include: {
        subscription: {
          select: {
            id: true,
            subscriptionNumber: true,
            status: true,
          },
        },
        lineItems: true,
        payments: true,
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
 * Get Printable / Detailed Invoice by ID (Customer Scoped)
 * GET /api/portal/invoices/:id
 */
export async function getCustomerInvoiceById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized: Token missing.', 401);
    }

    const { id } = req.params;
    const customerId = req.user.userId;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        customerId, // Strict customer security boundary
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
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
        lineItems: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new AppError(`Invoice with ID "${id}" was not found or access is denied.`, 404);
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

