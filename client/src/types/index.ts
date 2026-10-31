// ==============================================================================
// BRIGHTLOOP SUBSCRIPTION CLIENT - TYPESCRIPT PARITY DEFINITIONS
// ==============================================================================
// Mirrors backend Prisma ORM models and Express API contracts.
// ==============================================================================

// ------------------------------------------------------------------------------
// Domain Enums
// ------------------------------------------------------------------------------

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export enum ProductType {
  SERVICE = 'SERVICE',
  SOFTWARE = 'SOFTWARE',
  HARDWARE = 'HARDWARE',
  CONSUMABLE = 'CONSUMABLE',
}

export enum BillingFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum SubscriptionStatus {
  DRAFT = 'DRAFT',
  QUOTATION = 'QUOTATION',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum DiscountType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

export enum DiscountScope {
  PRODUCT = 'PRODUCT',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH = 'CASH',
  CHECK = 'CHECK',
  ONLINE_GATEWAY = 'ONLINE_GATEWAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ------------------------------------------------------------------------------
// Entity Models
// ------------------------------------------------------------------------------

export interface UserSafe {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantModel {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceSurcharge: number | string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductModel {
  id: string;
  name: string;
  code: string;
  type: ProductType;
  salesPrice: number | string;
  costPrice: number | string;
  notes: string | null;
  isActive: boolean;
  variants?: ProductVariantModel[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanModel {
  id: string;
  name: string;
  code: string;
  description: string | null;
  billingFrequency: BillingFrequency;
  minimumQuantity: number;
  validityDays: number | null;
  startDate: string | null;
  endDate: string | null;
  autoClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
  price: number | string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionLineItemModel {
  id: string;
  subscriptionId: string;
  productId: string;
  product?: ProductModel;
  variantId: string | null;
  variant?: ProductVariantModel | null;
  quantity: number;
  unitPrice: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  subtotal: number | string;
  totalAmount: number | string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionModel {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  customer?: UserSafe;
  planId: string;
  plan?: PlanModel;
  status: SubscriptionStatus;
  paymentTerms: string;
  startDate: string | null;
  expiryDate: string | null;
  nextBillingDate: string | null;
  autoRenew: boolean;
  notes: string | null;
  lineItems?: SubscriptionLineItemModel[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItemModel {
  id: string;
  invoiceId: string;
  productId: string | null;
  product?: ProductModel | null;
  variantId: string | null;
  variant?: ProductVariantModel | null;
  description: string;
  quantity: number;
  unitPrice: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  createdAt: string;
}

export interface InvoiceModel {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  subscription?: SubscriptionModel;
  customerId: string;
  customer?: UserSafe;
  status: InvoiceStatus;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  amountPaid: number | string;
  balanceDue: number | string;
  currency: string;
  notes: string | null;
  lineItems?: InvoiceLineItemModel[];
  payments?: PaymentModel[];
  createdAt: string;
  updatedAt: string;
}

export interface DiscountRuleModel {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number | string;
  scope: DiscountScope;
  targetProductId: string | null;
  minPurchaseAmount: number | string | null;
  minQuantity: number | null;
  maxUsage: number | null;
  usageCount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxRuleModel {
  id: string;
  name: string;
  rate: number | string;
  isCompound: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentModel {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoice?: InvoiceModel;
  customerId: string;
  customer?: UserSafe;
  amount: number | string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string | null;
  paidAt: string;
  auditNotes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// API Standard Responses
// ------------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    version: string;
  };
}

export interface DashboardSummaryDto {
  mrr: number;
  activeSubscriptionsCount: number;
  pendingReceivables: number;
  overdueInvoicesCount: number;
  overdueInvoicesTotal: number;
  currency: string;
}

