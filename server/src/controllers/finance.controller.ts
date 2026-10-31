import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { InvoiceStatus } from '../types/index.js';

/**
 * Finance Lead Executive Dashboard Analytics Controller
 * Meets the < 2-second query SLA using optimized composite indexes and database aggregations.
 * GET /api/finance/metrics
 */
export async function getFinanceMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();
  try {
    const { month, year } = req.query;
    const now = new Date();

    const selectedYear = year ? parseInt(String(year), 10) : now.getFullYear();
    const selectedMonth = month !== undefined ? parseInt(String(month), 10) : now.getMonth();

    const monthStart = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59));

    // Execute concurrent high-speed index-backed aggregations
    const [
      activeSubscriptionsCount,
      activeLineItems,
      collectedThisMonthAgg,
      totalUnpaidAgg,
      overdueInvoicesRaw,
      allMonthlyInvoices,
    ] = await Promise.all([
      // 1. Total Active Subscriptions
      prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),

      // 2. Active line items for accurate MRR / ARR calculation
      prisma.subscriptionLineItem.findMany({
        where: {
          subscription: { status: 'ACTIVE' },
        },
        select: {
          totalAmount: true,
          subscription: {
            select: {
              plan: {
                select: { billingFrequency: true },
              },
            },
          },
        },
      }),

      // 3. Collected revenue for the selected month
      prisma.payment.aggregate({
        where: {
          paidAt: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),

      // 4. Total outstanding unpaid revenue across all confirmed invoices
      prisma.invoice.aggregate({
        where: {
          status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.DRAFT] },
        },
        _sum: { balanceDue: true },
      }),

      // 5. Overdue invoices (utilizing @@index([status, dueDate]))
      prisma.invoice.findMany({
        where: {
          status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.DRAFT] },
          dueDate: { lt: now },
        },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, companyName: true, email: true, phone: true },
          },
          subscription: {
            select: { subscriptionNumber: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),

      // 6. Invoices for the past 6 months to construct monthly revenue trends chart
      prisma.invoice.findMany({
        where: {
          issueDate: {
            gte: new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1)),
          },
          status: { not: InvoiceStatus.CANCELLED },
        },
        select: {
          issueDate: true,
          totalAmount: true,
          amountPaid: true,
          status: true,
        },
      }),
    ]);

    // Calculate MRR & ARR dynamically
    let mrr = 0;
    for (const item of activeLineItems) {
      const amount = Number(item.totalAmount);
      const freq = item.subscription.plan.billingFrequency;
      if (freq === 'MONTHLY') mrr += amount;
      else if (freq === 'YEARLY') mrr += amount / 12;
      else if (freq === 'WEEKLY') mrr += (amount * 52) / 12;
      else if (freq === 'DAILY') mrr += amount * 30;
    }
    const arr = mrr * 12;

    const collectedThisMonth = Number(collectedThisMonthAgg._sum.amount || 0);
    const totalOutstanding = Number(totalUnpaidAgg._sum.balanceDue || 0);

    // Process Overdue aging buckets (1-30 days, 31-60 days, 60+ days)
    const overdueAging = {
      under30Days: 0,
      thirtyToSixtyDays: 0,
      overSixtyDays: 0,
    };

    const overdueList = overdueInvoicesRaw.map((inv) => {
      const due = new Date(inv.dueDate);
      const diffTime = Math.abs(now.getTime() - due.getTime());
      const agingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const bal = Number(inv.balanceDue);

      if (agingDays <= 30) overdueAging.under30Days += bal;
      else if (agingDays <= 60) overdueAging.thirtyToSixtyDays += bal;
      else overdueAging.overSixtyDays += bal;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        subscriptionNumber: inv.subscription?.subscriptionNumber || 'N/A',
        customerName: `${inv.customer.firstName} ${inv.customer.lastName}`,
        companyName: inv.customer.companyName || 'Individual',
        customerEmail: inv.customer.email,
        phone: inv.customer.phone || 'N/A',
        totalAmount: Number(inv.totalAmount),
        balanceDue: bal,
        dueDate: inv.dueDate,
        agingDays,
        status: inv.status,
      };
    });

    const totalOverdue = overdueList.reduce((acc, i) => acc + i.balanceDue, 0);

    // Build Monthly Revenue Trends (Past 6 Months) for Recharts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrendsMap: Record<string, { month: string; billed: number; collected: number }> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
      const key = `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      monthlyTrendsMap[key] = { month: key, billed: 0, collected: 0 };
    }

    allMonthlyInvoices.forEach((inv) => {
      const d = new Date(inv.issueDate);
      const key = `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      if (monthlyTrendsMap[key]) {
        monthlyTrendsMap[key].billed += Number(inv.totalAmount);
        monthlyTrendsMap[key].collected += Number(inv.amountPaid);
      }
    });

    const revenueTrends = Object.values(monthlyTrendsMap);

    const queryLatencyMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          activeSubscriptionsCount,
          mrr: Math.round(mrr * 100) / 100,
          arr: Math.round(arr * 100) / 100,
          collectedThisMonth,
          totalOutstanding,
          totalOverdue,
          overdueInvoicesCount: overdueList.length,
          currency: 'USD',
        },
        overdueAging,
        overdueList,
        revenueTrends,
        performance: {
          queryLatencyMs,
          slaCompliant: queryLatencyMs < 2000,
        },
      },
      meta: {
        timestamp: now.toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    next(error);
  }
}

