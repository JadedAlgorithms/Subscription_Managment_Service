import { Request, Response, NextFunction } from 'express';
import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '../types/index.js';

/**
 * Generates sequential payment number format: PAY-YYYY-XXXX
 */
async function generateNextPaymentNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PAY-${currentYear}-`;

  const lastPayment = await prisma.payment.findFirst({
    where: {
      paymentNumber: { startsWith: prefix },
    },
    orderBy: { paymentNumber: 'desc' },
    select: { paymentNumber: true },
  });

  if (!lastPayment) {
    return `${prefix}0001`;
  }

  const parts = lastPayment.paymentNumber.split('-');
  const lastSeq = parseInt(parts[2], 10);
  const nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

/**
 * Record a Payment against an Invoice
 * POST /api/payments
 */
export async function recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { invoiceId, amount, paymentMethod, transactionReference, auditNotes, paidAt } = req.body;

    if (!invoiceId || amount === undefined || !paymentMethod) {
      throw new AppError('invoiceId, numeric amount, and paymentMethod are required.', 400);
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
      throw new AppError(`Valid paymentMethod required (${Object.values(PaymentMethod).join(', ')}).`, 400);
    }

    const payAmount = new Decimal(amount);
    if (payAmount.lessThanOrEqualTo(0)) {
      throw new AppError('Payment amount must be greater than zero.', 400);
    }

    if (!req.user) throw new AppError('Unauthorized.', 401);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new AppError(`Invoice with ID "${invoiceId}" not found.`, 404);
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new AppError(`Cannot record payment against a CANCELLED invoice (${invoice.invoiceNumber}).`, 400);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError(`Invoice ${invoice.invoiceNumber} has already been paid in full.`, 400);
    }

    const currentBalanceDue = new Decimal(invoice.balanceDue.toString());
    if (payAmount.greaterThan(currentBalanceDue)) {
      throw new AppError(
        `Overpayment rejected: Payment amount ($${payAmount.toFixed(2)}) exceeds the current balance due ($${currentBalanceDue.toFixed(2)}).`,
        422
      );
    }

    const currentAmountPaid = new Decimal(invoice.amountPaid.toString());
    const newAmountPaid = currentAmountPaid.plus(payAmount);
    const newBalanceDue = currentBalanceDue.minus(payAmount);
    const isFullyPaid = newBalanceDue.lessThanOrEqualTo(0.001); // Safe precision boundary

    const paymentNumber = await generateNextPaymentNumber();

    // Execute Atomic Payment Transaction
    const { payment, updatedInvoice } = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: payAmount.toDecimalPlaces(2).toNumber(),
          paymentMethod: paymentMethod as PaymentMethod,
          status: PaymentStatus.COMPLETED,
          transactionReference: transactionReference ? String(transactionReference).trim() : null,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          auditNotes: auditNotes ? String(auditNotes).trim() : null,
          createdById: req.user!.userId,
        },
      });

      const inv = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid.toDecimalPlaces(2).toNumber(),
          balanceDue: newBalanceDue.toDecimalPlaces(2).toNumber(),
          status: isFullyPaid ? InvoiceStatus.PAID : invoice.status,
        },
      });

      return { payment: p, updatedInvoice: inv };
    });

    res.status(201).json({
      success: true,
      message: `Payment ${paymentNumber} recorded successfully for Invoice ${invoice.invoiceNumber}. Remaining balance: $${newBalanceDue.toFixed(2)}.`,
      data: {
        payment,
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all recorded payments
 * GET /api/payments
 */
export async function getPayments(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        invoice: {
          select: { invoiceNumber: true, status: true, totalAmount: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, companyName: true, email: true },
        },
        recordedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: payments,
      meta: { timestamp: new Date().toISOString(), version: '1.0.0', total: payments.length },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Real-time receivables breakdown: Paid vs. Outstanding vs. Overdue
 * GET /api/payments/receivables
 */
export async function getReceivablesBreakdown(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();

    const [paidInvoices, confirmedInvoices, overdueInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: InvoiceStatus.PAID },
        select: { totalAmount: true, amountPaid: true },
      }),
      prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.CONFIRMED,
          dueDate: { gte: now },
        },
        select: { balanceDue: true },
      }),
      prisma.invoice.findMany({
        where: {
          status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.DRAFT] },
          dueDate: { lt: now },
        },
        select: { id: true, invoiceNumber: true, customerId: true, balanceDue: true, dueDate: true },
      }),
    ]);

    const totalCollected = paidInvoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
    const totalCurrentReceivables = confirmedInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

    res.status(200).json({
      success: true,
      data: {
        totalCollected,
        totalCurrentReceivables,
        totalOverdue,
        totalOutstanding: totalCurrentReceivables + totalOverdue,
        overdueCount: overdueInvoices.length,
        currency: 'USD',
      },
    });
  } catch (error) {
    next(error);
  }
}

