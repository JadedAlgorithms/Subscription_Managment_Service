import { Router, Request, Response } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.routes.js';
import { productRouter, planRouter } from './product.routes.js';
import { subscriptionRouter, templateRouter } from './subscription.routes.js';
import { portalRouter } from './portal.routes.js';
import { billingRouter } from './billing.routes.js';
import { paymentRouter } from './payment.routes.js';
import { financeRouter } from './finance.routes.js';
import { prisma } from '../lib/prisma.js';
import { ApiResponse, DashboardSummaryDto } from '../types/index.js';

export const apiRouter = Router();

// Root API information route (/api or /api/v1)
apiRouter.get('/', (_req: Request, res: Response<ApiResponse>) => {
  res.status(200).json({
    success: true,
    message: 'Brightloop Subscription Management API v1',
    data: {
      status: 'ONLINE',
      version: '1.0.0',
      endpoints: {
        health: '/api/v1/health',
        overview: '/api/v1/overview',
        dashboardSummary: '/api/v1/dashboard/summary',
        auth: '/api/v1/auth',
        products: '/api/v1/products',
        plans: '/api/v1/plans',
        subscriptions: '/api/v1/subscriptions',
        templates: '/api/v1/templates',
        portal: '/api/v1/portal',
        billing: '/api/v1/billing',
        payments: '/api/v1/payments',
        finance: '/api/v1/finance',
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Mount System Health & Telemetry
apiRouter.use('/health', healthRouter);

// Mount Domain Modules
apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/plans', planRouter);
apiRouter.use('/subscriptions', subscriptionRouter);
apiRouter.use('/templates', templateRouter);
apiRouter.use('/portal', portalRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/finance', financeRouter);

/**
 * Phase 1 System Overview & Schema Metadata API
 */
apiRouter.get('/overview', async (_req: Request, res: Response<ApiResponse>) => {
  const timestamp = new Date().toISOString();

  let counts = {
    users: 0,
    products: 0,
    productVariants: 0,
    plans: 0,
    subscriptions: 0,
    invoices: 0,
    payments: 0,
    discountRules: 0,
  };

  try {
    const [
      userCount,
      productCount,
      variantCount,
      planCount,
      subscriptionCount,
      invoiceCount,
      paymentCount,
      discountCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.productVariant.count(),
      prisma.plan.count(),
      prisma.subscription.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
      prisma.discountRule.count(),
    ]);

    counts = {
      users: userCount,
      products: productCount,
      productVariants: variantCount,
      plans: planCount,
      subscriptions: subscriptionCount,
      invoices: invoiceCount,
      payments: paymentCount,
      discountRules: discountCount,
    };
  } catch {
    // Database might not be migrated yet in clean checkout
  }

  res.status(200).json({
    success: true,
    message: 'Brightloop Subscription Management Engine Phase 1 Overview',
    data: {
      system: 'Brightloop Subscription Management System',
      architecture: 'Clean Monorepo (Node.js LTS v20+ / Express / Prisma / PostgreSQL / React 19)',
      phase: 1,
      databaseCounts: counts,
      modulesConfigured: [
        'Authentication & RBAC (Admin, Staff, Customer)',
        'Product & Variant Catalog with Dynamic Price Surcharges',
        'Billing Plans & Cadence Rules (Daily, Weekly, Monthly, Yearly)',
        'Quote-to-Cash Subscriptions State Machine',
        'Automated Invoicing Engine with Billing Idempotency Index',
        'Discounts & Payment Reconciliation Engine',
      ],
    },
    meta: {
      timestamp,
      version: '1.0.0',
    },
  });
});

/**
 * High-performance Finance Dashboard Metrics (under 2s SLA)
 */
apiRouter.get('/dashboard/summary', async (_req: Request, res: Response<ApiResponse<DashboardSummaryDto>>) => {
  const timestamp = new Date().toISOString();

  try {
    const now = new Date();

    const [activeSubs, overdueInvoices, pendingReceivablesAggregate] = await Promise.all([
      prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.invoice.findMany({
        where: {
          status: { in: ['CONFIRMED', 'DRAFT'] },
          dueDate: { lt: now },
        },
        select: { balanceDue: true },
      }),
      prisma.invoice.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'DRAFT'] },
        },
        _sum: {
          balanceDue: true,
        },
      }),
    ]);

    const overdueTotal = overdueInvoices.reduce(
      (acc, inv) => acc + Number(inv.balanceDue),
      0
    );

    // Calculate MRR from active subscriptions
    const activeSubItems = await prisma.subscriptionLineItem.findMany({
      where: {
        subscription: { status: 'ACTIVE' },
      },
      select: {
        totalAmount: true,
      },
    });

    const mrr = activeSubItems.reduce(
      (sum, item) => sum + Number(item.totalAmount),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        mrr,
        activeSubscriptionsCount: activeSubs,
        pendingReceivables: Number(pendingReceivablesAggregate._sum.balanceDue ?? 0),
        overdueInvoicesCount: overdueInvoices.length,
        overdueInvoicesTotal: overdueTotal,
        currency: 'USD',
      },
      meta: {
        timestamp,
        version: '1.0.0',
      },
    });
  } catch (error) {
    // If DB is offline or not yet migrated, return empty metrics gracefully
    res.status(200).json({
      success: true,
      data: {
        mrr: 0,
        activeSubscriptionsCount: 0,
        pendingReceivables: 0,
        overdueInvoicesCount: 0,
        overdueInvoicesTotal: 0,
        currency: 'USD',
      },
      meta: {
        timestamp,
        version: '1.0.0',
      },
    });
  }
});

