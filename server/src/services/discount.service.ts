import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma.js';
import { DiscountType, DiscountScope } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

export interface EvaluatedDiscount {
  ruleId: string;
  code: string;
  type: DiscountType;
  discountAmount: Decimal;
  appliedScope: DiscountScope;
  targetProductId?: string | null;
}

/**
 * Evaluates active and eligible discount rules for a given subscription and its line items.
 * Evaluates constraints: dates, minimum purchase, minimum quantity, usage limits, and product scoping.
 */
export async function evaluateDiscountsForSubscription(params: {
  subtotal: Decimal;
  totalQuantity: number;
  items: { productId: string; lineSubtotal: Decimal; quantity: number }[];
}): Promise<EvaluatedDiscount | null> {
  const now = new Date();

  // Find candidate active discount rules
  const activeRules = await prisma.discountRule.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const rule of activeRules) {
    // Check usage limits
    if (rule.maxUsage !== null && rule.usageCount >= rule.maxUsage) {
      // Auto-deactivate exhausted rules
      await prisma.discountRule.update({
        where: { id: rule.id },
        data: { isActive: false },
      });
      continue;
    }

    // Check minimum purchase amount constraint
    if (rule.minPurchaseAmount && params.subtotal.lessThan(new Decimal(rule.minPurchaseAmount.toString()))) {
      continue;
    }

    // Check minimum quantity constraint
    if (rule.minQuantity && params.totalQuantity < rule.minQuantity) {
      continue;
    }

    // Check scope: PRODUCT vs. SUBSCRIPTION
    if (rule.scope === DiscountScope.PRODUCT && rule.targetProductId) {
      const matchingItem = params.items.find((i) => i.productId === rule.targetProductId);
      if (!matchingItem) continue;

      let discount = new Decimal(0);
      if (rule.type === DiscountType.PERCENTAGE) {
        discount = matchingItem.lineSubtotal.times(new Decimal(rule.value.toString())).dividedBy(100);
      } else {
        discount = new Decimal(rule.value.toString());
      }

      // Discount cannot exceed the item subtotal
      if (discount.greaterThan(matchingItem.lineSubtotal)) {
        discount = matchingItem.lineSubtotal;
      }

      return {
        ruleId: rule.id,
        code: rule.code,
        type: rule.type as DiscountType,
        discountAmount: discount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        appliedScope: DiscountScope.PRODUCT,
        targetProductId: rule.targetProductId,
      };
    } else {
      // SUBSCRIPTION Scope
      let discount = new Decimal(0);
      if (rule.type === DiscountType.PERCENTAGE) {
        discount = params.subtotal.times(new Decimal(rule.value.toString())).dividedBy(100);
      } else {
        discount = new Decimal(rule.value.toString());
      }

      // Discount cannot exceed subtotal
      if (discount.greaterThan(params.subtotal)) {
        discount = params.subtotal;
      }

      return {
        ruleId: rule.id,
        code: rule.code,
        type: rule.type as DiscountType,
        discountAmount: discount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        appliedScope: DiscountScope.SUBSCRIPTION,
      };
    }
  }

  return null;
}

/**
 * Increment discount rule usage count and auto-deactivate if threshold is reached.
 */
export async function recordDiscountUsage(ruleId: string, tx: typeof prisma = prisma): Promise<void> {
  const rule = await tx.discountRule.findUnique({ where: { id: ruleId } });
  if (!rule) return;

  const nextCount = rule.usageCount + 1;
  const shouldDeactivate = rule.maxUsage !== null && nextCount >= rule.maxUsage;

  await tx.discountRule.update({
    where: { id: ruleId },
    data: {
      usageCount: nextCount,
      isActive: shouldDeactivate ? false : rule.isActive,
    },
  });
}

/**
 * Admin-restricted creation of dynamic discount rules.
 */
export async function createDiscountRule(
  data: {
    code: string;
    description?: string;
    type: DiscountType;
    value: number;
    scope: DiscountScope;
    targetProductId?: string;
    minPurchaseAmount?: number;
    minQuantity?: number;
    maxUsage?: number;
    startDate?: string;
    endDate?: string;
  },
  adminUserId: string
) {
  const existing = await prisma.discountRule.findUnique({
    where: { code: data.code.trim().toUpperCase() },
  });

  if (existing) {
    throw new AppError(`Discount code "${data.code}" already exists.`, 409);
  }

  return prisma.discountRule.create({
    data: {
      code: data.code.trim().toUpperCase(),
      description: data.description ? data.description.trim() : null,
      type: data.type,
      value: new Decimal(data.value).toDecimalPlaces(2).toNumber(),
      scope: data.scope,
      targetProductId: data.targetProductId || null,
      minPurchaseAmount: data.minPurchaseAmount ? new Decimal(data.minPurchaseAmount).toNumber() : null,
      minQuantity: data.minQuantity || 1,
      maxUsage: data.maxUsage || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isActive: true,
      createdById: adminUserId,
    },
    include: {
      targetProduct: true,
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
}

