import Decimal from 'decimal.js';
import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { BillingFrequency, InvoiceStatus } from '@prisma/client';
import { evaluateDiscountsForSubscription, recordDiscountUsage } from './discount.service.js';

export interface BillingRunResult {
  runTimestamp: string;
  totalActiveEvaluated: number;
  invoicesCreated: number;
  skippedDuplicates: number;
  failedCount: number;
  invoiceIds: string[];
  errors: { subscriptionId: string; message: string }[];
}

/**
 * Generates sequential invoice number format: INV-YYYY-XXXX
 */
async function generateNextInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  });

  if (!lastInvoice) {
    return `${prefix}0001`;
  }

  const parts = lastInvoice.invoiceNumber.split('-');
  const lastSeq = parseInt(parts[2], 10);
  const nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

/**
 * Calculates end date of a billing period according to plan frequency.
 */
function calculatePeriodEnd(startDate: Date, frequency: BillingFrequency): Date {
  const end = new Date(startDate);
  switch (frequency) {
    case BillingFrequency.DAILY:
      end.setDate(end.getDate() + 1);
      break;
    case BillingFrequency.WEEKLY:
      end.setDate(end.getDate() + 7);
      break;
    case BillingFrequency.MONTHLY:
      end.setMonth(end.getMonth() + 1);
      break;
    case BillingFrequency.YEARLY:
      end.setFullYear(end.getFullYear() + 1);
      break;
  }
  return end;
}

/**
 * Advances the next billing date for an active subscription.
 */
function advanceNextBillingDate(currentNextBillingDate: Date, frequency: BillingFrequency): Date {
  return calculatePeriodEnd(currentNextBillingDate, frequency);
}

/**
 * Core Automated Billing Engine
 * Identifies active subscriptions due for billing, verifies composite idempotency,
 * applies dynamic variant surcharges, evaluates discounts, calculates taxes with Decimal precision,
 * and creates invoices.
 */
export async function runBillingCycle(): Promise<BillingRunResult> {
  const now = new Date();
  const result: BillingRunResult = {
    runTimestamp: now.toISOString(),
    totalActiveEvaluated: 0,
    invoicesCreated: 0,
    skippedDuplicates: 0,
    failedCount: 0,
    invoiceIds: [],
    errors: [],
  };

  console.log(`[Billing Engine] Initiating automated billing cycle at ${now.toISOString()}...`);

  // Fetch active default tax rule
  const defaultTaxRule = await prisma.taxRule.findFirst({
    where: { isActive: true, isDefault: true },
  });
  const systemTaxRate = defaultTaxRule ? new Decimal(defaultTaxRule.rate.toString()) : new Decimal('8.25');

  // Query all ACTIVE subscriptions due on or before today
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { nextBillingDate: { lte: now } },
        { nextBillingDate: null },
      ],
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

  result.totalActiveEvaluated = dueSubscriptions.length;
  console.log(`[Billing Engine] Found ${dueSubscriptions.length} active subscription(s) eligible for billing.`);

  for (const sub of dueSubscriptions) {
    try {
      // Determine billing period bounds
      const billingPeriodStart = sub.nextBillingDate ? new Date(sub.nextBillingDate) : new Date(now);
      // Normalize to midnight UTC to prevent microsecond drift in idempotency key
      billingPeriodStart.setUTCHours(0, 0, 0, 0);

      const billingPeriodEnd = calculatePeriodEnd(billingPeriodStart, sub.plan.billingFrequency);
      billingPeriodEnd.setUTCHours(0, 0, 0, 0);

      // MATHEMATICAL BILLING IDEMPOTENCY CHECK
      // Check composite unique key constraint: (subscriptionId, billingPeriodStart)
      const existingInvoice = await prisma.invoice.findUnique({
        where: {
          subscription_billing_period_unique: {
            subscriptionId: sub.id,
            billingPeriodStart,
          },
        },
      });

      if (existingInvoice) {
        console.log(`[Billing Engine] Idempotency guard triggered: Subscription ${sub.subscriptionNumber} already invoiced for period ${billingPeriodStart.toISOString()}. Skipping.`);
        result.skippedDuplicates++;

        // Advance nextBillingDate if it's lagging behind
        const nextDate = advanceNextBillingDate(billingPeriodStart, sub.plan.billingFrequency);
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { nextBillingDate: nextDate },
        });
        continue;
      }

      // Check if subscription has expired
      if (sub.expiryDate && now > sub.expiryDate) {
        if (sub.plan.autoClose) {
          console.log(`[Billing Engine] Subscription ${sub.subscriptionNumber} reached expiry date and autoClose is enabled. Closing.`);
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'CLOSED' },
          });
          continue;
        }
      }

      // Calculate Line Items with dynamic variant modifiers
      let subtotalDecimal = new Decimal(0);
      let totalQty = 0;

      const preparedLineItems = sub.lineItems.map((item) => {
        const baseSalesPrice = new Decimal(item.product.salesPrice.toString());
        const variantSurcharge = item.variant ? new Decimal(item.variant.priceSurcharge.toString()) : new Decimal(0);
        const unitPrice = baseSalesPrice.plus(variantSurcharge);

        const qty = item.quantity || 1;
        totalQty += qty;
        const lineSubtotal = unitPrice.times(qty);
        subtotalDecimal = subtotalDecimal.plus(lineSubtotal);

        return {
          productId: item.productId,
          variantId: item.variantId || null,
          description: `${item.product.name}${item.variant ? ` (${item.variant.name} +$${variantSurcharge.toFixed(2)})` : ''}`,
          quantity: qty,
          unitPrice,
          lineSubtotal,
        };
      });

      // Evaluate Dynamic Discounts
      const discountEvaluation = await evaluateDiscountsForSubscription({
        subtotal: subtotalDecimal,
        totalQuantity: totalQty,
        items: preparedLineItems.map((i) => ({
          productId: i.productId,
          lineSubtotal: i.lineSubtotal,
          quantity: i.quantity,
        })),
      });

      const discountAmount = discountEvaluation ? discountEvaluation.discountAmount : new Decimal(0);
      const taxableSubtotal = Decimal.max(0, subtotalDecimal.minus(discountAmount));

      // Calculate Taxes with Decimal precision
      const taxAmount = taxableSubtotal.times(systemTaxRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const totalAmount = taxableSubtotal.plus(taxAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      const invoiceNumber = await generateNextInvoiceNumber();

      // Due date calculation (Net terms e.g., Net 30, Net 15, or Immediate)
      const dueDate = new Date(now);
      if (sub.paymentTerms === 'Net 15') dueDate.setDate(dueDate.getDate() + 15);
      else if (sub.paymentTerms === 'Net 60') dueDate.setDate(dueDate.getDate() + 60);
      else if (sub.paymentTerms === 'Immediate') dueDate.setDate(dueDate.getDate() + 1);
      else dueDate.setDate(dueDate.getDate() + 30); // Default Net 30

      // Execute Atomic Transaction: Create Invoice + Advance Subscription Next Billing Date
      const nextBillingDate = advanceNextBillingDate(billingPeriodStart, sub.plan.billingFrequency);

      const createdInvoice = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            subscriptionId: sub.id,
            customerId: sub.customerId,
            status: InvoiceStatus.CONFIRMED,
            billingPeriodStart,
            billingPeriodEnd,
            issueDate: now,
            dueDate,
            subtotal: subtotalDecimal.toDecimalPlaces(2).toNumber(),
            taxAmount: taxAmount.toNumber(),
            discountAmount: discountAmount.toNumber(),
            totalAmount: totalAmount.toNumber(),
            amountPaid: 0.00,
            balanceDue: totalAmount.toNumber(),
            currency: sub.plan.currency || 'USD',
            notes: discountEvaluation
              ? `Auto-applied discount rule "${discountEvaluation.code}" (${discountEvaluation.type}): -$${discountAmount.toFixed(2)}`
              : 'Automated recurring billing run invoice.',
            lineItems: {
              create: preparedLineItems.map((i) => {
                const lineTax = i.lineSubtotal.times(systemTaxRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
                return {
                  productId: i.productId,
                  variantId: i.variantId,
                  description: i.description,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice.toDecimalPlaces(2).toNumber(),
                  taxRate: systemTaxRate.toNumber(),
                  taxAmount: lineTax.toNumber(),
                  discountAmount: 0.00,
                  totalAmount: i.lineSubtotal.plus(lineTax).toDecimalPlaces(2).toNumber(),
                };
              }),
            },
          },
        });

        // Record discount usage if applied
        if (discountEvaluation) {
          await recordDiscountUsage(discountEvaluation.ruleId, tx as unknown as typeof prisma);
        }

        // Advance next billing date on subscription
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            nextBillingDate,
            notes: `${sub.notes ? sub.notes + '\n' : ''}[${now.toISOString()}] Invoiced as ${invoiceNumber}. Next billing date: ${nextBillingDate.toISOString()}`,
          },
        });

        return inv;
      });

      result.invoicesCreated++;
      result.invoiceIds.push(createdInvoice.id);
      console.log(`[Billing Engine] Generated Invoice ${createdInvoice.invoiceNumber} for Subscription ${sub.subscriptionNumber}. Total: $${totalAmount.toFixed(2)}.`);
    } catch (subError) {
      console.error(`[Billing Engine] Error processing subscription ${sub.id}:`, subError);
      result.failedCount++;
      result.errors.push({
        subscriptionId: sub.id,
        message: subError instanceof Error ? subError.message : 'Unknown billing error',
      });
    }
  }

  console.log(`[Billing Engine] Cycle completed: ${result.invoicesCreated} created, ${result.skippedDuplicates} skipped, ${result.failedCount} failed.`);
  return result;
}

/**
 * Initializes the automated node-cron scheduled job.
 * Executes daily at 00:00 (Midnight).
 */
export function initBillingCron(): void {
  cron.schedule('0 0 * * *', async () => {
    console.log('[Billing Cron Worker] Running daily automated billing schedule...');
    try {
      await runBillingCycle();
    } catch (err) {
      console.error('[Billing Cron Worker] Fatal error in scheduled billing run:', err);
    }
  });

  console.log('⏱️ [Billing Cron Worker] Scheduled daily billing cycle (0 0 * * *).');
}
