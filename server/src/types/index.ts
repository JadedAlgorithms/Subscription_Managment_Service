// ==============================================================================
// BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM - DOMAIN TYPES & DTO SPECIFICATIONS
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
// Safe Domain Entity Models
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ProductVariantModel {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceSurcharge: number | string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PlanModel {
  id: string;
  name: string;
  code: string;
  description: string | null;
  billingFrequency: BillingFrequency;
  minimumQuantity: number;
  validityDays: number | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  autoClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
  price: number | string;
  currency: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
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
  createdAt: Date | string;
  updatedAt: Date | string;
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
  startDate: Date | string | null;
  expiryDate: Date | string | null;
  nextBillingDate: Date | string | null;
  autoRenew: boolean;
  notes: string | null;
  lineItems?: SubscriptionLineItemModel[];
  createdAt: Date | string;
  updatedAt: Date | string;
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
  createdAt: Date | string;
}

export interface InvoiceModel {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  subscription?: SubscriptionModel;
  customerId: string;
  customer?: UserSafe;
  status: InvoiceStatus;
  billingPeriodStart: Date | string;
  billingPeriodEnd: Date | string;
  issueDate: Date | string;
  dueDate: Date | string;
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DiscountRuleModel {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number | string;
  scope: DiscountScope;
  targetProductId: string | null;
  targetProduct?: ProductModel | null;
  minPurchaseAmount: number | string | null;
  minQuantity: number | null;
  maxUsage: number | null;
  usageCount: number;
  startDate: Date | string | null;
  endDate: Date | string | null;
  isActive: boolean;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TaxRuleModel {
  id: string;
  name: string;
  rate: number | string;
  isCompound: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
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
  paidAt: Date | string;
  auditNotes: string | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ------------------------------------------------------------------------------
// Request DTOs (Data Transfer Objects)
// ------------------------------------------------------------------------------

export interface RegisterUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface CreateProductDto {
  name: string;
  code: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes?: string;
  variants?: {
    name: string;
    sku: string;
    priceSurcharge: number;
    notes?: string;
  }[];
}

export interface CreatePlanDto {
  name: string;
  code: string;
  description?: string;
  billingFrequency: BillingFrequency;
  minimumQuantity?: number;
  validityDays?: number;
  startDate?: string;
  endDate?: string;
  autoClose?: boolean;
  allowPause?: boolean;
  allowRenew?: boolean;
  price: number;
  currency?: string;
}

export interface CreateSubscriptionDto {
  customerId: string;
  planId: string;
  paymentTerms?: string;
  startDate: string;
  expiryDate?: string;
  autoRenew?: boolean;
  notes?: string;
  lineItems: {
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discountAmount?: number;
    notes?: string;
  }[];
}

export interface RecordPaymentDto {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  auditNotes?: string;
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
    total?: number;
    page?: number;
    limit?: number;
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

