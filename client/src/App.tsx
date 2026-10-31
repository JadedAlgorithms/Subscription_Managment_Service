import { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Calendar,
  FileText,
  CreditCard,
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Code2,
  RefreshCw,
  Zap,
  Lock,
  UserCheck,
  Tag
} from 'lucide-react';
import { UserRole } from './types';

interface HealthData {
  status: string;
  uptimeSeconds: number;
  database: {
    status: string;
    latencyMs: number | null;
  };
  system: {
    nodeVersion: string;
    platform: string;
    rssMb: string;
    heapUsedMb: string;
  };
}

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ADMIN);
  const [activeTab, setActiveTab] = useState<'architecture' | 'schema' | 'seed' | 'idempotency'>('architecture');

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const json = await res.json();
        setHealth(json.data);
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                Brightloop <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">Phase 1</span>
              </span>
              <p className="text-xs text-slate-400">Subscription Management & Billing Engine</p>
            </div>
          </div>

          {/* Real-time Health Telemetry Pill */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900">
              <div className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-300 font-mono">
                API: {health ? 'ONLINE' : 'CONNECTING...'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-mono">
                DB: {health?.database?.status === 'connected' ? `${health.database.latencyMs}ms` : 'STANDBY'}
              </span>
            </div>

            <button
              onClick={fetchHealth}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Refresh Health Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="border-b border-slate-800/80 bg-gradient-to-b from-slate-900/40 to-slate-950 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" /> High-Concurreny Recurring Revenue Core
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Phase 1 Architecture & Foundation
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
              Clean Monorepo orchestration separating the Express/TypeScript API with Prisma ORM from
              the React 19 Client. Complete with mathematical billing idempotency, dynamic variant surcharges, and RBAC fixtures.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl min-w-[140px]">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Architecture</span>
                <Server className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono">Node v20+</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Express + Prisma</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl min-w-[140px]">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Storage</span>
                <Database className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono">PostgreSQL</div>
              <div className="text-[11px] text-indigo-400 mt-0.5">Decimal Precision</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'architecture'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              System Modules
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'schema'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Prisma Data Models
            </button>
            <button
              onClick={() => setActiveTab('seed')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'seed'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Seed Data & Test Accounts
            </button>
            <button
              onClick={() => setActiveTab('idempotency')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'idempotency'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Billing Idempotency
            </button>
          </div>

          {/* Interactive RBAC Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Preview Role:</span>
            <div className="flex space-x-1">
              {[UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER].map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`text-[11px] font-mono px-2 py-1 rounded-md transition ${
                    selectedRole === role
                      ? 'bg-slate-800 text-sky-400 font-semibold border border-slate-700'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 1: Architecture Modules */}
        {activeTab === 'architecture' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: RBAC */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">1. Auth & RBAC</h3>
              <p className="text-slate-400 text-sm mt-2">
                Hierarchical role governance (ADMIN, STAFF, CUSTOMER) with strict password rules (8+ chars, upper, lower, special), bcrypt hashing, and password reset token handling.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-purple-400">
                <span>Model: User</span>
                <span>Role: {selectedRole}</span>
              </div>
            </div>

            {/* Card 2: Products & Variants */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">2. Products & Variants</h3>
              <p className="text-slate-400 text-sm mt-2">
                Base catalog with high-precision Decimal sales/cost pricing. ProductVariant handles dynamic price surcharges (e.g. +$560 for Odoo brand integration).
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-sky-400">
                <span>Decimal(12, 2)</span>
                <span>Dynamic Surcharges</span>
              </div>
            </div>

            {/* Card 3: Plans & Cadence */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">3. Billing Cadence & Plans</h3>
              <p className="text-slate-400 text-sm mt-2">
                Cadence options (DAILY, WEEKLY, MONTHLY, YEARLY). Configurable lifecycle rules including autoClose, allowPause, allowRenew, and minimum quantities.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-emerald-400">
                <span>Lifecycle Flags</span>
                <span>Multi-Cadence</span>
              </div>
            </div>

            {/* Card 4: Quote to Cash */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">4. Quote-to-Cash Engine</h3>
              <p className="text-slate-400 text-sm mt-2">
                State machine: DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED. Tracks customer, plan, payment terms, and calculated line items.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-amber-400">
                <span>Unique Sub Code</span>
                <span>Quotation Templates</span>
              </div>
            </div>

            {/* Card 5: Invoicing & Idempotency */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">5. Automated Invoicing</h3>
              <p className="text-slate-400 text-sm mt-2">
                Sequential invoice numbers with exact subtotal, taxAmount, discountAmount, and totalAmount. Mathematical idempotency prevents duplicate billing runs.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-rose-400">
                <span>Idempotent Composite</span>
                <span>&lt; 2s Overdue Index</span>
              </div>
            </div>

            {/* Card 6: Discounts & Payments */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">6. Payments & Discounts</h3>
              <p className="text-slate-400 text-sm mt-2">
                Admin-controlled discount engine (FIXED or PERCENTAGE, scoped to product or subscription) and audit payment logging (BANK_TRANSFER, CREDIT_CARD, CASH).
              </p>
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-teal-400">
                <span>Audit Logs</span>
                <span>Auto-Reconciliation</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Prisma Models */}
        {activeTab === 'schema' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Code2 className="w-5 h-5 text-sky-400" /> Complete Prisma Entities & Relational Map
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-sky-400 font-bold text-sm">User & Authentication</div>
                  <div className="text-slate-400">• id (UUID, PK)</div>
                  <div className="text-slate-400">• email (String, UNIQUE)</div>
                  <div className="text-slate-400">• passwordHash (Bcrypt String)</div>
                  <div className="text-slate-400">• role (Enum: ADMIN | STAFF | CUSTOMER)</div>
                  <div className="text-slate-400">• relations: subscriptions, invoices, payments, discounts</div>
                  <div className="text-emerald-400 font-medium">Index: @@index([email]), @@index([role, isActive])</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-sky-400 font-bold text-sm">Product & Dynamic Variants</div>
                  <div className="text-slate-400">• Product: code (UNIQUE), salesPrice, costPrice (Decimal 12,2)</div>
                  <div className="text-slate-400">• ProductVariant: sku (UNIQUE), priceSurcharge (Decimal 12,2)</div>
                  <div className="text-slate-400">• Example: Odoo Variant (+560.00 surcharge)</div>
                  <div className="text-emerald-400 font-medium">Index: @@index([code]), @@index([productId]), @@index([sku])</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-sky-400 font-bold text-sm">Plan & Billing Cadence</div>
                  <div className="text-slate-400">• code (UNIQUE), billingFrequency (DAILY | WEEKLY | MONTHLY | YEARLY)</div>
                  <div className="text-slate-400">• Lifecycle: autoClose, allowPause, allowRenew</div>
                  <div className="text-slate-400">• price (Decimal 12,2), minimumQuantity</div>
                  <div className="text-emerald-400 font-medium">Index: @@index([code]), @@index([billingFrequency])</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-sky-400 font-bold text-sm">Subscription (Quote-to-Cash)</div>
                  <div className="text-slate-400">• subscriptionNumber (UNIQUE, e.g. SUB-2026-0001)</div>
                  <div className="text-slate-400">• status: DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED</div>
                  <div className="text-slate-400">• Line Items: quantity, unitPrice, taxRate, taxAmount, totalAmount</div>
                  <div className="text-emerald-400 font-medium">Index: @@index([customerId, status]), @@index([nextBillingDate])</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-rose-400 font-bold text-sm">Invoice & Idempotency Key</div>
                  <div className="text-slate-400">• invoiceNumber (UNIQUE, e.g. INV-2026-0001)</div>
                  <div className="text-slate-400">• status: DRAFT | CONFIRMED | PAID | CANCELLED</div>
                  <div className="text-slate-400">• subtotal, taxAmount, discountAmount, totalAmount, balanceDue</div>
                  <div className="text-amber-400 font-bold">@@unique([subscriptionId, billingPeriodStart])</div>
                  <div className="text-emerald-400 font-medium">Index: @@index([status, dueDate]) (overdue &lt; 2s lookup)</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-teal-400 font-bold text-sm">Discounts & Payments</div>
                  <div className="text-slate-400">• DiscountRule: code (UNIQUE), type (FIXED | PERCENTAGE), scope</div>
                  <div className="text-slate-400">• Payment: paymentNumber (UNIQUE), invoiceId, paymentMethod</div>
                  <div className="text-slate-400">• Methods: BANK_TRANSFER | CREDIT_CARD | DEBIT_CARD | CASH</div>
                  <div className="text-emerald-400 font-medium">Index: @@index([invoiceId]), @@index([paidAt])</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Seed Data */}
        {activeTab === 'seed' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" /> Automated Seed Fixtures (server/prisma/seed.ts)
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Executable via <code className="bg-slate-950 px-2 py-0.5 rounded text-sky-400">npx prisma db seed</code> or <code className="bg-slate-950 px-2 py-0.5 rounded text-sky-400">npm run db:seed</code>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Full Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Test Password</th>
                      <th className="py-2.5 px-3">Company / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">ADMIN</span></td>
                      <td className="py-3 px-3 text-white font-medium">Sarah Connor</td>
                      <td className="py-3 px-3 text-sky-400">admin@brightloop.io</td>
                      <td className="py-3 px-3 text-slate-300 bg-slate-950/60 rounded">BrightloopAdmin@2026</td>
                      <td className="py-3 px-3 text-slate-400">Full System & Discount Rules Authority</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">STAFF</span></td>
                      <td className="py-3 px-3 text-white font-medium">Alex Murphy</td>
                      <td className="py-3 px-3 text-sky-400">staff@brightloop.io</td>
                      <td className="py-3 px-3 text-slate-300 bg-slate-950/60 rounded">BrightloopStaff@2026</td>
                      <td className="py-3 px-3 text-slate-400">Operational Subscriptions & Quote Generator</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">CUSTOMER</span></td>
                      <td className="py-3 px-3 text-white font-medium">Bruce Wayne</td>
                      <td className="py-3 px-3 text-sky-400">billing@acmecorp.com</td>
                      <td className="py-3 px-3 text-slate-300 bg-slate-950/60 rounded">AcmeCustomer@2026</td>
                      <td className="py-3 px-3 text-slate-400">Acme Corp (Active Sub with +560 Odoo Variant)</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">CUSTOMER</span></td>
                      <td className="py-3 px-3 text-white font-medium">Hank Scorpio</td>
                      <td className="py-3 px-3 text-sky-400">tech@globex.org</td>
                      <td className="py-3 px-3 text-slate-300 bg-slate-950/60 rounded">GlobexCustomer@2026</td>
                      <td className="py-3 px-3 text-slate-400">Globex Corp (Draft Quotation SUB-2026-0002)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Seeded Products highlight */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-sky-400" /> Seeded Catalog Highlights
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-white font-medium">Brightloop ERP Core Engine</div>
                    <div className="text-slate-400">Base Price: $1,200.00 / mo</div>
                    <div className="text-emerald-400 font-mono mt-1">+ $560.00 Odoo Surcharge SKU: BL-ERP-ODOO-560</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-white font-medium">Managed Cloud DevOps & SRE</div>
                    <div className="text-slate-400">Base Price: $450.00 / mo</div>
                    <div className="text-indigo-400 font-mono mt-1">+ $350.00 24x7 Mission-Critical SLA</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-white font-medium">Quotation Template</div>
                    <div className="text-slate-400">Code: TMPL-ENT-001</div>
                    <div className="text-amber-400 font-mono mt-1">Pre-bundled ERP + Odoo + DevOps Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Idempotency */}
        {activeTab === 'idempotency' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" /> Mathematical Guarantee Against Double-Billing
              </h3>
              <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
                Recurring billing systems face critical race conditions when concurrent cron jobs, retry loops, or manual triggers fire on billing day. Brightloop enforces zero duplicate billing at the PostgreSQL relational engine layer.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="text-slate-400">// In server/prisma/schema.prisma:</div>
              <div className="text-sky-300">
                @@unique([subscriptionId, billingPeriodStart], name: "subscription_billing_period_unique")
              </div>
              <div className="text-slate-400">// Translates to PostgreSQL DDL:</div>
              <div className="text-emerald-400">
                CREATE UNIQUE INDEX "invoices_subscription_billing_period_unique" ON "invoices" ("subscriptionId", "billingPeriodStart");
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-emerald-400 font-semibold text-sm flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Atomic Invariant Preserved
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Even if 10 concurrent billing workers process the exact same subscription for the same billing period simultaneously, exactly one transaction will commit. The remaining 9 will be rejected immediately by PostgreSQL with error code <code className="text-rose-400 font-mono">P2002</code>, caught cleanly by our centralized error middleware.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-sky-400 font-semibold text-sm flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" /> Performance SLA Under 2 Seconds
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Composite index <code className="text-amber-400 font-mono">@@index([status, dueDate])</code> ensures that checking overdue invoices across hundreds of thousands of customer records executes in single-digit milliseconds during finance dashboard queries.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span>Brightloop Software</span>
            <span>•</span>
            <span>Subscription Management System Phase 1</span>
          </div>
          <div className="font-mono text-slate-400">
            Node.js (LTS v20+) • TypeScript • Express • Prisma • PostgreSQL • React 19 • Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  );
}

