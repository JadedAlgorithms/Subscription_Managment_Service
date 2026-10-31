import { PrismaClient, UserRole, ProductType, BillingFrequency, SubscriptionStatus, InvoiceStatus, DiscountType, DiscountScope, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Expanding Brightloop Database with Comprehensive Multi-Industry Data...');

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
  // 1. Users & RBAC (Admins, Staff, and 6 Diverse Enterprise Customers)
  // ----------------------------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash('BrightloopAdmin@2026', 10);
  const staffPasswordHash = await bcrypt.hash('BrightloopStaff@2026', 10);
  const acmePasswordHash = await bcrypt.hash('AcmeCustomer@2026', 10);
  const globexPasswordHash = await bcrypt.hash('GlobexCustomer@2026', 10);
  const starkPasswordHash = await bcrypt.hash('StarkCustomer@2026', 10);
  const oscorpPasswordHash = await bcrypt.hash('OscorpCustomer@2026', 10);
  const cyberdynePasswordHash = await bcrypt.hash('CyberdyneCustomer@2026', 10);
  const waystarPasswordHash = await bcrypt.hash('WaystarCustomer@2026', 10);

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
      passwordHash: acmePasswordHash,
      firstName: 'Bruce',
      lastName: 'Wayne',
      companyName: 'Acme Corporation',
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
      companyName: 'Globex International',
      phone: '+1-555-0122',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'tony@starkindustries.com',
      passwordHash: starkPasswordHash,
      firstName: 'Tony',
      lastName: 'Stark',
      companyName: 'Stark Industries Defense & Tech',
      phone: '+1-555-0188',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  const customer4 = await prisma.user.create({
    data: {
      email: 'norman@oscorp.net',
      passwordHash: oscorpPasswordHash,
      firstName: 'Norman',
      lastName: 'Osborn',
      companyName: 'Oscorp Chemical & BioTech',
      phone: '+1-555-0177',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  const customer5 = await prisma.user.create({
    data: {
      email: 'miles@cyberdyne.ai',
      passwordHash: cyberdynePasswordHash,
      firstName: 'Miles',
      lastName: 'Dyson',
      companyName: 'Cyberdyne Systems AI',
      phone: '+1-555-0166',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  const customer6 = await prisma.user.create({
    data: {
      email: 'logan@waystar.com',
      passwordHash: waystarPasswordHash,
      firstName: 'Logan',
      lastName: 'Roy',
      companyName: 'Waystar Royco Global Media',
      phone: '+1-555-0155',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  console.log('👥 Created Users: 1 Admin, 1 Staff, 6 Enterprise Customers.');

  // ----------------------------------------------------------------------------
  // 2. Tax Rules
  // ----------------------------------------------------------------------------
  await prisma.taxRule.create({
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
      name: 'European Union Digital Services VAT (20.00%)',
      rate: 20.00,
      isCompound: false,
      isDefault: false,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.taxRule.create({
    data: {
      name: 'B2B International Cross-Border (0.00%)',
      rate: 0.00,
      isCompound: false,
      isDefault: false,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  console.log('🏛️ Created 3 Configurable Tax Rules.');

  // ----------------------------------------------------------------------------
  // 3. Products & Product Variants (with dynamic surcharges)
  // ----------------------------------------------------------------------------
  const erpProduct = await prisma.product.create({
    data: {
      name: 'Brightloop ERP Core Engine',
      code: 'PROD-ERP-CORE',
      type: ProductType.SOFTWARE,
      salesPrice: 1200.00,
      costPrice: 300.00,
      notes: 'Unified ledger, recurring billing engine, and double-entry accounting automation.',
      isActive: true,
    },
  });

  const odooVariant = await prisma.productVariant.create({
    data: {
      productId: erpProduct.id,
      name: 'Odoo Enterprise Synchronization Connector',
      sku: 'BL-ERP-ODOO-560',
      priceSurcharge: 560.00, // Explicit prompt requirement (+560 for Odoo variant)
      notes: 'Real-time two-way synchronization bridge with Odoo instance.',
      isActive: true,
    },
  });

  const sapVariant = await prisma.productVariant.create({
    data: {
      productId: erpProduct.id,
      name: 'SAP NetWeaver Live Integration Adapter',
      sku: 'BL-ERP-SAP-980',
      priceSurcharge: 980.00,
      notes: 'High-throughput enterprise pipeline for SAP systems.',
      isActive: true,
    },
  });

  const standardVariant = await prisma.productVariant.create({
    data: {
      productId: erpProduct.id,
      name: 'Standard Cloud Multi-Tenant Edition',
      sku: 'BL-ERP-STD-00',
      priceSurcharge: 0.00,
      notes: 'Default cloud hosted edition.',
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
      notes: 'Dedicated engineer on-call with 15-minute guaranteed SLA.',
      isActive: true,
    },
  });

  const bankConnector = await prisma.product.create({
    data: {
      name: 'Automated Bank Reconciliation Connector',
      code: 'PROD-BANK-RECON',
      type: ProductType.SOFTWARE,
      salesPrice: 350.00,
      costPrice: 80.00,
      notes: 'Automated settlement and statement parsing for 12,000+ financial institutions.',
      isActive: true,
    },
  });

  const multiCurrencyVariant = await prisma.productVariant.create({
    data: {
      productId: bankConnector.id,
      name: 'Multi-Currency Realtime FX Hedging Pack',
      sku: 'BL-BANK-FX-180',
      priceSurcharge: 180.00,
      notes: 'Supports automated conversion and hedging across 48 fiat currencies.',
      isActive: true,
    },
  });

  const biAnalytics = await prisma.product.create({
    data: {
      name: 'CFO Financial Analytics & Forecasting Suite',
      code: 'PROD-BI-SUITE',
      type: ProductType.SOFTWARE,
      salesPrice: 800.00,
      costPrice: 200.00,
      notes: 'Predictive churn modeling, cohort analysis, and automated board deck generation.',
      isActive: true,
    },
  });

  console.log('📦 Created 4 Products and 6 Variants (including Odoo +$560, SAP +$980, DevOps 24/7 +$350).');

  // ----------------------------------------------------------------------------
  // 4. Billing Plans
  // ----------------------------------------------------------------------------
  const monthlyPlan = await prisma.plan.create({
    data: {
      name: 'Professional Monthly SaaS Subscription',
      code: 'PLAN-PRO-MONTHLY',
      description: 'Standard monthly recurring subscription plan.',
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
      description: 'Annual commitment with quarterly architecture reviews and enterprise SLA.',
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
      description: 'Flexible week-by-week testing plan.',
      billingFrequency: BillingFrequency.WEEKLY,
      minimumQuantity: 1,
      validityDays: 60,
      autoClose: true,
      allowPause: false,
      allowRenew: true,
      price: 350.00,
      currency: 'USD',
      isActive: true,
    },
  });

  const dailyComputePlan = await prisma.plan.create({
    data: {
      name: 'High-Performance Daily Compute Allocation',
      code: 'PLAN-COMPUTE-DAILY',
      description: 'Daily billed cluster compute nodes.',
      billingFrequency: BillingFrequency.DAILY,
      minimumQuantity: 2,
      validityDays: 30,
      autoClose: false,
      allowPause: true,
      allowRenew: false,
      price: 85.00,
      currency: 'USD',
      isActive: true,
    },
  });

  console.log('🗓️ Created 4 Billing Plans (Daily, Weekly, Monthly, Yearly).');

  // ----------------------------------------------------------------------------
  // 5. Discount Rules
  // ----------------------------------------------------------------------------
  await prisma.discountRule.create({
    data: {
      code: 'ENTERPRISE20',
      description: '20% off for high-volume enterprise software deployments',
      type: DiscountType.PERCENTAGE,
      value: 20.00,
      scope: DiscountScope.SUBSCRIPTION,
      minPurchaseAmount: 1500.00,
      minQuantity: 1,
      maxUsage: 50,
      usageCount: 4,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.discountRule.create({
    data: {
      code: 'WELCOME150',
      description: '$150 instant rebate on onboarding invoice',
      type: DiscountType.FIXED,
      value: 150.00,
      scope: DiscountScope.SUBSCRIPTION,
      minPurchaseAmount: 800.00,
      minQuantity: 1,
      maxUsage: 200,
      usageCount: 12,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  await prisma.discountRule.create({
    data: {
      code: 'ODOOFREE25',
      description: '25% discount specifically on Odoo Synchronization connectors',
      type: DiscountType.PERCENTAGE,
      value: 25.00,
      scope: DiscountScope.PRODUCT,
      targetProductId: erpProduct.id,
      minPurchaseAmount: 500.00,
      minQuantity: 1,
      maxUsage: 100,
      usageCount: 2,
      isActive: true,
      createdById: adminUser.id,
    },
  });

  console.log('🏷️ Created 3 Discount Rules.');

  // ----------------------------------------------------------------------------
  // 6. Quotation Templates
  // ----------------------------------------------------------------------------
  await prisma.quotationTemplate.create({
    data: {
      name: 'Brightloop Enterprise Onboarding Template',
      code: 'TMPL-ENT-001',
      description: 'Complete package: ERP Core, Odoo Sync, and 24x7 Mission Critical Support.',
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

  await prisma.quotationTemplate.create({
    data: {
      name: 'Financial Ledger & Bank Automation Bundle',
      code: 'TMPL-FIN-RECON',
      description: 'Automated bank reconciliation plus CFO Analytics Suite.',
      planId: monthlyPlan.id,
      defaultPaymentTerms: 'Net 15',
      validityDays: 30,
      isActive: true,
      createdById: staffUser.id,
      items: {
        create: [
          {
            productId: bankConnector.id,
            variantId: multiCurrencyVariant.id,
            quantity: 2,
            discountPct: 0.00,
          },
          {
            productId: biAnalytics.id,
            quantity: 1,
            discountPct: 15.00,
          },
        ],
      },
    },
  });

  console.log('📋 Created 2 Quotation Templates.');

  // ----------------------------------------------------------------------------
  // 7. Subscriptions (Across Diverse Lifecycles: ACTIVE, CONFIRMED, QUOTATION, CLOSED)
  // ----------------------------------------------------------------------------
  const now = new Date();

  // Sub 1: Acme Corp - ACTIVE (Monthly ERP + Odoo)
  const sub1Start = new Date(now);
  sub1Start.setDate(sub1Start.getDate() - 45);
  const sub1Next = new Date(now);
  sub1Next.setDate(sub1Next.getDate() + 15);

  const sub1 = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0001',
      customerId: customer1.id,
      planId: monthlyPlan.id,
      status: SubscriptionStatus.ACTIVE,
      paymentTerms: 'Net 30',
      startDate: sub1Start,
      expiryDate: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000),
      nextBillingDate: sub1Next,
      autoRenew: true,
      notes: 'Acme Corp core ERP engine with active Odoo live ledger synchronization.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            quantity: 1,
            unitPrice: 1760.00, // 1200 + 560
            taxRate: 8.25,
            taxAmount: 145.20,
            discountAmount: 0.00,
            subtotal: 1760.00,
            totalAmount: 1905.20,
            notes: 'Brightloop ERP Core + Odoo Brand Connector',
          },
        ],
      },
    },
  });

  // Sub 2: Globex Corp - QUOTATION State
  await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0002',
      customerId: customer2.id,
      planId: annualPlan.id,
      status: SubscriptionStatus.QUOTATION,
      paymentTerms: 'Immediate',
      startDate: now,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      autoRenew: true,
      notes: 'Pending customer review and purchase order sign-off.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: standardVariant.id,
            quantity: 4,
            unitPrice: 1200.00,
            taxRate: 8.25,
            taxAmount: 396.00,
            discountAmount: 400.00,
            subtotal: 4800.00,
            totalAmount: 4796.00,
            notes: '4 user tier cloud SaaS allocation',
          },
        ],
      },
    },
  });

  // Sub 3: Stark Industries - ACTIVE (Enterprise Annual with SAP + 24x7 Mission Critical Support)
  const sub3Start = new Date(now);
  sub3Start.setDate(sub3Start.getDate() - 120);
  const sub3Next = new Date(now);
  sub3Next.setDate(sub3Next.getDate() - 2); // Due for immediate billing run testing!

  const sub3 = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0003',
      customerId: customer3.id,
      planId: annualPlan.id,
      status: SubscriptionStatus.ACTIVE,
      paymentTerms: 'Net 15',
      startDate: sub3Start,
      expiryDate: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000),
      nextBillingDate: sub3Next,
      autoRenew: true,
      notes: 'Defense contractor tier with high availability and SAP bridge.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: sapVariant.id,
            quantity: 2,
            unitPrice: 2180.00, // 1200 + 980
            taxRate: 8.25,
            taxAmount: 359.70,
            discountAmount: 0.00,
            subtotal: 4360.00,
            totalAmount: 4719.70,
            notes: 'Dual-node SAP NetWeaver connectors',
          },
          {
            productId: devopsService.id,
            variantId: missionCriticalVariant.id,
            quantity: 1,
            unitPrice: 800.00, // 450 + 350
            taxRate: 8.25,
            taxAmount: 66.00,
            discountAmount: 0.00,
            subtotal: 800.00,
            totalAmount: 866.00,
            notes: '24/7 dedicated incident response',
          },
        ],
      },
    },
  });

  // Sub 4: Oscorp - ACTIVE (Monthly Banking + Financial Analytics)
  const sub4Start = new Date(now);
  sub4Start.setDate(sub4Start.getDate() - 60);

  const sub4 = await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0004',
      customerId: customer4.id,
      planId: monthlyPlan.id,
      status: SubscriptionStatus.ACTIVE,
      paymentTerms: 'Net 30',
      startDate: sub4Start,
      expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      nextBillingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      autoRenew: true,
      notes: 'Treasury automation and forecasting suite.',
      lineItems: {
        create: [
          {
            productId: bankConnector.id,
            variantId: multiCurrencyVariant.id,
            quantity: 3,
            unitPrice: 530.00, // 350 + 180
            taxRate: 8.25,
            taxAmount: 131.18,
            discountAmount: 0.00,
            subtotal: 1590.00,
            totalAmount: 1721.18,
          },
          {
            productId: biAnalytics.id,
            quantity: 1,
            unitPrice: 800.00,
            taxRate: 8.25,
            taxAmount: 66.00,
            discountAmount: 100.00,
            subtotal: 800.00,
            totalAmount: 766.00,
          },
        ],
      },
    },
  });

  // Sub 5: Cyberdyne - CONFIRMED (Awaiting Service Kickoff)
  await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0005',
      customerId: customer5.id,
      planId: monthlyPlan.id,
      status: SubscriptionStatus.CONFIRMED,
      paymentTerms: 'Net 30',
      startDate: now,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: true,
      notes: 'Order confirmed; provisioning automated pipeline.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: standardVariant.id,
            quantity: 2,
            unitPrice: 1200.00,
            taxRate: 8.25,
            taxAmount: 198.00,
            discountAmount: 0.00,
            subtotal: 2400.00,
            totalAmount: 2598.00,
          },
        ],
      },
    },
  });

  // Sub 6: Waystar Royco - CLOSED
  await prisma.subscription.create({
    data: {
      subscriptionNumber: 'SUB-2026-0006',
      customerId: customer6.id,
      planId: weeklyPlan.id,
      status: SubscriptionStatus.CLOSED,
      paymentTerms: 'Immediate',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      autoRenew: false,
      notes: 'Completed evaluation trial period. Terminated per schedule.',
      lineItems: {
        create: [
          {
            productId: bankConnector.id,
            quantity: 1,
            unitPrice: 350.00,
            taxRate: 8.25,
            taxAmount: 28.88,
            discountAmount: 0.00,
            subtotal: 350.00,
            totalAmount: 378.88,
          },
        ],
      },
    },
  });

  console.log('🔄 Created 6 Subscriptions across ACTIVE, QUOTATION, CONFIRMED, and CLOSED states.');

  // ----------------------------------------------------------------------------
  // 8. Invoices (Paid, Confirmed, Draft, and Overdue for Finance Dashboard Aging)
  // ----------------------------------------------------------------------------
  // Inv 1: Acme Corp - Historical PAID
  const inv1Date = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      subscriptionId: sub1.id,
      customerId: customer1.id,
      status: InvoiceStatus.PAID,
      billingPeriodStart: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      billingPeriodEnd: inv1Date,
      issueDate: inv1Date,
      dueDate: new Date(inv1Date.getTime() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 1760.00,
      taxAmount: 145.20,
      discountAmount: 0.00,
      totalAmount: 1905.20,
      amountPaid: 1905.20,
      balanceDue: 0.00,
      currency: 'USD',
      notes: 'Cycle 1 settled in full via Automated Wire.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            description: 'Brightloop ERP Core Engine with Odoo Synchronization',
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

  // Inv 2: Acme Corp - Active CONFIRMED (Current Cycle)
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      subscriptionId: sub1.id,
      customerId: customer1.id,
      status: InvoiceStatus.CONFIRMED,
      billingPeriodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      billingPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // Due in 20 days
      subtotal: 1760.00,
      taxAmount: 145.20,
      discountAmount: 0.00,
      totalAmount: 1905.20,
      amountPaid: 0.00,
      balanceDue: 1905.20,
      currency: 'USD',
      notes: 'Current billing period invoice.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: odooVariant.id,
            description: 'Brightloop ERP Core Engine with Odoo Synchronization',
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

  // Inv 3: Stark Industries - Historical PAID
  const inv3Date = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const inv3 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0003',
      subscriptionId: sub3.id,
      customerId: customer3.id,
      status: InvoiceStatus.PAID,
      billingPeriodStart: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      billingPeriodEnd: inv3Date,
      issueDate: inv3Date,
      dueDate: new Date(inv3Date.getTime() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 5160.00,
      taxAmount: 425.70,
      discountAmount: 200.00,
      totalAmount: 5385.70,
      amountPaid: 5385.70,
      balanceDue: 0.00,
      currency: 'USD',
      notes: 'Enterprise annual deployment invoice settled.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: sapVariant.id,
            description: 'Brightloop ERP Core with SAP Integration',
            quantity: 2,
            unitPrice: 2180.00,
            taxRate: 8.25,
            taxAmount: 359.70,
            discountAmount: 200.00,
            totalAmount: 4519.70,
          },
          {
            productId: devopsService.id,
            variantId: missionCriticalVariant.id,
            description: '24x7 Mission Critical SRE Support',
            quantity: 1,
            unitPrice: 800.00,
            taxRate: 8.25,
            taxAmount: 66.00,
            discountAmount: 0.00,
            totalAmount: 866.00,
          },
        ],
      },
    },
  });

  // Inv 4: Stark Industries - OVERDUE (15 days overdue -> Aging 1-30 days)
  const inv4Due = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0004',
      subscriptionId: sub3.id,
      customerId: customer3.id,
      status: InvoiceStatus.CONFIRMED,
      billingPeriodStart: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      billingPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dueDate: inv4Due,
      subtotal: 5160.00,
      taxAmount: 425.70,
      discountAmount: 0.00,
      totalAmount: 5585.70,
      amountPaid: 1000.00,
      balanceDue: 4585.70, // $4,585.70 overdue
      currency: 'USD',
      notes: 'Partial payment received. Remaining balance overdue.',
      lineItems: {
        create: [
          {
            productId: erpProduct.id,
            variantId: sapVariant.id,
            description: 'Brightloop ERP Core with SAP Integration',
            quantity: 2,
            unitPrice: 2180.00,
            taxRate: 8.25,
            taxAmount: 359.70,
            discountAmount: 0.00,
            totalAmount: 4719.70,
          },
        ],
      },
    },
  });

  // Inv 5: Oscorp - OVERDUE (45 days overdue -> Aging 31-60 days)
  const inv5Due = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0005',
      subscriptionId: sub4.id,
      customerId: customer4.id,
      status: InvoiceStatus.CONFIRMED,
      billingPeriodStart: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
      billingPeriodEnd: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
      dueDate: inv5Due,
      subtotal: 2390.00,
      taxAmount: 197.18,
      discountAmount: 0.00,
      totalAmount: 2587.18,
      amountPaid: 0.00,
      balanceDue: 2587.18, // $2,587.18 overdue
      currency: 'USD',
      notes: 'Second follow-up letter dispatched.',
      lineItems: {
        create: [
          {
            productId: bankConnector.id,
            variantId: multiCurrencyVariant.id,
            description: 'Automated Bank Reconciliation FX Suite',
            quantity: 3,
            unitPrice: 530.00,
            taxRate: 8.25,
            taxAmount: 131.18,
            discountAmount: 0.00,
            totalAmount: 1721.18,
          },
        ],
      },
    },
  });

  // Inv 6: Oscorp - CURRENT PAID
  const inv6 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0006',
      subscriptionId: sub4.id,
      customerId: customer4.id,
      status: InvoiceStatus.PAID,
      billingPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      billingPeriodEnd: now,
      issueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 2390.00,
      taxAmount: 197.18,
      discountAmount: 150.00,
      totalAmount: 2437.18,
      amountPaid: 2437.18,
      balanceDue: 0.00,
      currency: 'USD',
      notes: 'Paid on invoice issuance via Corporate Credit Card.',
      lineItems: {
        create: [
          {
            productId: biAnalytics.id,
            description: 'CFO Financial Analytics & Forecasting Suite',
            quantity: 1,
            unitPrice: 800.00,
            taxRate: 8.25,
            taxAmount: 66.00,
            discountAmount: 150.00,
            totalAmount: 716.00,
          },
        ],
      },
    },
  });

  console.log('🧾 Created 6 Invoices spanning PAID, CONFIRMED, and OVERDUE aging stages.');

  // ----------------------------------------------------------------------------
  // 9. Payment Reconciliation Records
  // ----------------------------------------------------------------------------
  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-0001',
      invoiceId: inv1.id,
      customerId: customer1.id,
      amount: 1905.20,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.COMPLETED,
      transactionReference: 'ACH-WIRE-TXN-9842109',
      paidAt: inv1Date,
      auditNotes: 'Verified via Wells Fargo Corporate ACH settlement batch.',
      createdById: staffUser.id,
    },
  });

  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-0002',
      invoiceId: inv3.id,
      customerId: customer3.id,
      amount: 5385.70,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.COMPLETED,
      transactionReference: 'JPM-FEDWIRE-8891002',
      paidAt: inv3Date,
      auditNotes: 'JPMorgan Chase Federal Reserve Wire clearance.',
      createdById: adminUser.id,
    },
  });

  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2026-0003',
      invoiceId: inv6.id,
      customerId: customer4.id,
      amount: 2437.18,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.COMPLETED,
      transactionReference: 'AMEX-CORP-488102',
      paidAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      auditNotes: 'American Express Corporate settlement.',
      createdById: staffUser.id,
    },
  });

  console.log('💵 Created 3 Reconciled Payments totaling $9,728.08.');

  console.log('\n================================================================');
  console.log('✅ EXPANDED DATA SEED COMPLETED SUCCESSFULLY');
  console.log('================================================================');
  console.log('Enterprise Test Accounts:');
  console.log('  Admin:       admin@brightloop.io          / BrightloopAdmin@2026');
  console.log('  Staff:       staff@brightloop.io          / BrightloopStaff@2026');
  console.log('  Customer 1:  billing@acmecorp.com         / AcmeCustomer@2026');
  console.log('  Customer 2:  tech@globex.org              / GlobexCustomer@2026');
  console.log('  Customer 3:  tony@starkindustries.com     / StarkCustomer@2026 (Has Overdue)');
  console.log('  Customer 4:  norman@oscorp.net            / OscorpCustomer@2026 (Has Overdue)');
  console.log('  Customer 5:  miles@cyberdyne.ai           / CyberdyneCustomer@2026');
  console.log('  Customer 6:  logan@waystar.com            / WaystarCustomer@2026');
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
