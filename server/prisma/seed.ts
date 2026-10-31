import { PrismaClient, UserRole, ProductType, BillingFrequency, SubscriptionStatus, InvoiceStatus, DiscountType, DiscountScope, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Brightloop Subscription Management System Database Seed...');

  // Clean existing records in reverse dependency order
  await prisma.payment.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLineItem.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplateItem.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Purged existing database records.');

  // ----------------------------------------------------------------------------
  // 1. Users & RBAC
  // ----------------------------------------------------------------------------
  // Passwords follow strict policy: 8+ chars, upper, lower, special
  const adminPasswordHash = await bcrypt.hash('BrightloopAdmin@2026', 10);
  const staffPasswordHash = await bcrypt.hash('BrightloopStaff@2026', 10);
  const customerPasswordHash = await bcrypt.hash('AcmeCustomer@2026', 10);
  const globexPasswordHash = await bcrypt.hash('GlobexCustomer@2026', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@brightloop.io',
      passwordHash: adminPasswordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      companyName: 'Brightloop Technologies HQ',
      phone: '+1-555-0199',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@brightloop.io',
      passwordHash: staffPasswordHash,
      firstName: 'Alex',
      lastName: 'Murphy',
      companyName: 'Brightloop Technologies Operations',
      phone: '+1-555-0144',
      role: UserRole.STAFF,
      isActive: true,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'billing@acmecorp.com',
      passwordHash: customerPasswordHash,
      firstName: 'Bruce',
      lastName: 'Wayne',
      companyName: 'Acme Corporation Enterprises',
      phone: '+1-555-0101',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'tech@globex.org',
      passwordHash: globexPasswordHash,
      firstName: 'Hank',
      lastName: 'Scorpio',
      companyName: 'Globex Corporation International',
      phone: '+1-555-0122',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  console.log('👥 Created Users: Admin, Staff, and 2 Customers.');

  // ----------------------------------------------------------------------------
  // 2. Tax Rules
  // ----------------------------------------------------------------------------
  const defaultTaxRule = await prisma.taxRule.create({
    data: {
      name: 'Standard State Sales Tax (8.25%)',
      rate: 8.25,
      isCompound: false,
      isDefault: true,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.taxRule.create({
    data: {
      name: 'B2B International Zero-Rated VAT (0.00%)',
      rate: 0.00,
      isCompound: false,
      isDefault: false,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  console.log('🏛️ Created Tax Rules.');

  // ----------------------------------------------------------------------------
  // 3. Products & Product Variants (with +560 for Odoo Variant)
  // ----------------------------------------------------------------------------
  const erpProduct = await prisma.product.create({
    data: {
      name: 'Brightloop ERP Core Engine',
      code: 'PROD-ERP-CORE',
      type: ProductType.SOFTWARE,
      salesPrice: 1200.00,
      costPrice: 300.00,
      notes: 'Full recurring billing, accounting, and subscription automation engine.',
      isActive: true,
    },
  });

  const odooVariant = await prisma.productVariant.create({
    data: {
      productId: erpProduct.id,
      name: 'Odoo Enterprise Synchronization Connector',
      sku: 'BL-ERP-ODOO-560',
      priceSurcharge: 560.00, // Explicit prompt requirement (+560 for Odoo variant)
      notes: 'Bi-directional live ledger synchronization adapter for Odoo instances.',
      isActive: true,
    },
  });

  const standardVariant = await prisma.productVariant.create({
    data: {
      productId: erpProduct.id,
      name: 'Standard Cloud Multi-Tenant',
      sku: 'BL-ERP-STD-00',
      priceSurcharge: 0.00,
      notes: 'Standard hosted SaaS environment without third-party connector hooks.',
      isActive: true,
    },
  });

  const devopsService = await prisma.product.create({
    data: {
      name: 'Managed Cloud DevOps & SRE Support',
      code: 'PROD-SVC-DEVOPS',
      type: ProductType.SERVICE,
      salesPrice: 450.00,
      costPrice: 150.00,
      notes: '24/7 infrastructure monitoring, database backups, and security patching.',
      isActive: true,
    },
  });

  const missionCriticalVariant = await prisma.productVariant.create({
    data: {
      productId: devopsService.id,
      name: '24x7 Mission-Critical SLA (15 min response)',
      sku: 'BL-SVC-24X7-350',
      priceSurcharge: 350.00,
      notes: 'Dedicated incident commander and guaranteed 15-minute response SLA.',
      isActive: true,
    },
  });

  console.log('📦 Created Products & Variants (including Odoo +560 variant).');

  // ----------------------------------------------------------------------------
  // 4. Billing Plans
  // ----------------------------------------------------------------------------
  const monthlyPlan = await prisma.plan.create({
    data: {
      name: 'Professional Monthly SaaS Subscription',
      code: 'PLAN-PRO-MONTHLY',
      description: 'Standard billing cadence billed on the 1st of every calendar month.',
      billingFrequency: BillingFrequency.MONTHLY,
      minimumQuantity: 1,
      validityDays: 365,
      autoClose: false,
      allowPause: true,
      allowRenew: true,
      price: 1200.00,
      currency: 'USD',
      isActive: true,
    },
  });

  const annualPlan = await prisma.plan.create({
    data: {
      name: 'Enterprise Annual Tier (2 Months Free Included)',
      code: 'PLAN-ENT-ANNUAL',
      description: 'Full-year commitment with priority SLA support and quarterly reviews.',
      billingFrequency: BillingFrequency.YEARLY,
      minimumQuantity: 1,
      validityDays: 365,
      autoClose: false,
      allowPause: true,
      allowRenew: true,
      price: 12000.00,
      currency: 'USD',
      isActive: true,
    },
  });

  const weeklyPlan = await prisma.plan.create({
    data: {
      name: 'Agile Weekly Sprint Pilot',
      code: 'PLAN-PILOT-WEEKLY',
      description: 'Flexible week-by-week billing trial plan.',
      billingFrequency: BillingFrequency.WEEKLY,
      minimumQuantity: 1,
      validityDays: 90,
      autoClose: true,
      allowPause: false,
      allowRenew: true,
      price: 350.00,
      currency: 'USD',
      isActive: true,
    },
  });

  console.log('🗓️ Created Billing Plans (Monthly, Yearly, Weekly).');

  // ----------------------------------------------------------------------------
  // 5. Discount Rules
  // ----------------------------------------------------------------------------
  const percentageDiscount = await prisma.discountRule.create({
    data: {
      code: 'ENTERPRISE15',
      description: '15% discount for long-term recurring enterprise commitments',
      type: DiscountType.PERCENTAGE,
      value: 15.00,
      scope: DiscountScope.SUBSCRIPTION,
      minPurchaseAmount: 1000.00,
      minQuantity: 1,
      maxUsage: 100,
      usageCount: 1,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.discountRule.create({
    data: {
      code: 'WELCOME100',
      description: '$100 initial onboarding rebate on first subscription cycle',
      type: DiscountType.FIXED,
      value: 100.00,
      scope: DiscountScope.SUBSCRIPTION,
      minPurchaseAmount: 500.00,
      minQuantity: 1,
      maxUsage: 500,
      usageCount: 0,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  console.log('🏷️ Created Discount Rules.');

  // ----------------------------------------------------------------------------
  // 6. Quotation Templates
  // ----------------------------------------------------------------------------
  const quoteTemplate = await prisma.quotationTemplate.create({
    data: {
      name: 'Brightloop Enterprise Onboarding Template',
      code: 'TMPL-ENT-001',
      description: 'Pre-packaged quote including ERP Core, Odoo Connector, and DevOps support.',
      planId: annualPlan.id,
      defaultPaymentTerms: 'Net 30',
      validityDays: 45,
      isActive: true,
      createdById: staffUser.id,
      items: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            quantity: 1,
            discountPct: 10.00,
          },
          {
            productId: devopsService.id,
            variantId: missionCriticalVariant.id,
            quantity: 1,
            discountPct: 5.00,
          },
        ],
      },
    },
  });

  console.log('📋 Created Quotation Template:', quoteTemplate.name);

  // ----------------------------------------------------------------------------
  // 7. Active Subscriptions & Line Items
  // ----------------------------------------------------------------------------
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 30 days ago
  const expiryDate = new Date(startDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const nextBillingDate = new Date();
  nextBillingDate.setDate(nextBillingDate.getDate() + 1); // Tomorrow

  // Active Subscription for Customer 1 (Acme Corp)
  const activeSubscription = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0001',
      customerId: customer1.id,
      planId: monthlyPlan.id,
      status: SubscriptionStatus.ACTIVE,
      paymentTerms: 'Net 30',
      startDate,
      expiryDate,
      nextBillingDate,
      autoRenew: true,
      notes: 'Acme Corporation standard monthly subscription with Odoo live sync.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            quantity: 1,
            unitPrice: 1760.00, // 1200 base + 560 Odoo surcharge
            taxRate: 8.25,
            taxAmount: 145.20,
            discountAmount: 0.00,
            subtotal: 1760.00,
            totalAmount: 1905.20,
            notes: 'Brightloop ERP Core + Odoo Brand Integration Suite variant',
          },
        ],
      },
    },
  });

  // Quotation State Subscription for Customer 2 (Globex)
  const draftQuote = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0002',
      customerId: customer2.id,
      planId: annualPlan.id,
      status: SubscriptionStatus.QUOTATION,
      paymentTerms: 'Immediate',
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      autoRenew: true,
      notes: 'Pending customer formal electronic signature and purchase order.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: standardVariant.id,
            quantity: 5,
            unitPrice: 1200.00,
            taxRate: 0.00,
            taxAmount: 0.00,
            discountAmount: 600.00,
            subtotal: 6000.00,
            totalAmount: 5400.00,
            notes: '5 multi-tenant ERP user seats with standard support',
          },
        ],
      },
    },
  });

  console.log('🔄 Created Subscriptions: SUB-2026-0001 (ACTIVE), SUB-2026-0002 (QUOTATION).');

  // ----------------------------------------------------------------------------
  // 8. Invoices & Billing Idempotency Testing Fixtures
  // ----------------------------------------------------------------------------
  // Historical Paid Invoice (billing period: 30 days ago to today)
  const billingStartPast = new Date(startDate);
  const billingEndPast = new Date();

  const paidInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      subscriptionId: activeSubscription.id,
      customerId: customer1.id,
      status: InvoiceStatus.PAID,
      billingPeriodStart: billingStartPast,
      billingPeriodEnd: billingEndPast,
      issueDate: billingStartPast,
      dueDate: new Date(billingStartPast.getTime() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 1760.00,
      taxAmount: 145.20,
      discountAmount: 0.00,
      totalAmount: 1905.20,
      amountPaid: 1905.20,
      balanceDue: 0.00,
      currency: 'USD',
      notes: 'First billing cycle paid in full via Automated ACH Wire.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            description: 'Brightloop ERP Core Engine with Odoo Connector',
            quantity: 1,
            unitPrice: 1760.00,
            taxRate: 8.25,
            taxAmount: 145.20,
            discountAmount: 0.00,
            totalAmount: 1905.20,
          },
        ],
      },
    },
  });

  // Current Confirmed Invoice (billing period: today to 30 days ahead)
  const billingStartCurrent = new Date();
  const billingEndCurrent = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const confirmedInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      subscriptionId: activeSubscription.id,
      customerId: customer1.id,
      status: InvoiceStatus.CONFIRMED,
      billingPeriodStart: billingStartCurrent,
      billingPeriodEnd: billingEndCurrent,
      issueDate: billingStartCurrent,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
      subtotal: 1760.00,
      taxAmount: 145.20,
      discountAmount: 0.00,
      totalAmount: 1905.20,
      amountPaid: 0.00,
      balanceDue: 1905.20,
      currency: 'USD',
      notes: 'Upcoming recurring billing cycle invoice.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            description: 'Brightloop ERP Core Engine with Odoo Connector',
            quantity: 1,
            unitPrice: 1760.00,
            taxRate: 8.25,
            taxAmount: 145.20,
            discountAmount: 0.00,
            totalAmount: 1905.20,
          },
        ],
      },
    },
  });

  console.log('🧾 Created Invoices: INV-2026-0001 (PAID) and INV-2026-0002 (CONFIRMED).');

  // ----------------------------------------------------------------------------
  // 9. Payment Reconciliation
  // ----------------------------------------------------------------------------
  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-0001',
      invoiceId: paidInvoice.id,
      customerId: customer1.id,
      amount: 1905.20,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.COMPLETED,
      transactionReference: 'ACH-WIRE-TXN-9842109',
      paidAt: billingStartPast,
      auditNotes: 'Verified via Wells Fargo Corporate ACH settlement batch.',
      createdById: staffUser.id,
    },
  });

  console.log('💵 Created Reconciled Payment Record: PAY-2026-0001.');

  console.log('\n================================================================');
  console.log('✅ BRIGHTLOOP SEED COMPLETED SUCCESSFULLY');
  console.log('================================================================');
  console.log('Test Credentials:');
  console.log('  Admin:    admin@brightloop.io   / BrightloopAdmin@2026');
  console.log('  Staff:    staff@brightloop.io   / BrightloopStaff@2026');
  console.log('  Customer: billing@acmecorp.com  / AcmeCustomer@2026');
  console.log('  Customer: tech@globex.org       / GlobexCustomer@2026');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

