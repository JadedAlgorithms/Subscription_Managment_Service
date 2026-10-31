import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Zap,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Receipt,
  CreditCard,
  Search,
  Filter
} from 'lucide-react';
import { InvoiceModel, InvoiceStatus } from '../../types';
import { InvoiceDetailModal } from '../../components/InvoiceDetailModal';
import { PaymentModal } from '../../components/PaymentModal';

interface BillingRunTelemetry {
  invoicesCreated: number;
  skippedDuplicates: number;
  failedCount: number;
  runTimestamp: string;
}

export const BillingCenterPage: React.FC = () => {
  const { token } = useAuth();

  const [invoices, setInvoices] = useState<InvoiceModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Runner state
  const [runningBilling, setRunningBilling] = useState<boolean>(false);
  const [lastTelemetry, setLastTelemetry] = useState<BillingRunTelemetry | null>(null);

  // Modal selections
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceModel | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceModel | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/billing/invoices?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch invoices.');
      setInvoices(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading invoices.');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, searchQuery]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleTriggerRun = async () => {
    setRunningBilling(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/billing/trigger-run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to execute billing run.');

      setLastTelemetry(json.data);
      setSuccess(`Billing run executed successfully: ${json.data.invoicesCreated} created, ${json.data.skippedDuplicates} skipped.`);
      fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error executing billing run.');
    } finally {
      setRunningBilling(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case InvoiceStatus.CONFIRMED:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case InvoiceStatus.DRAFT:
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case InvoiceStatus.CANCELLED:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
  };

  const openDetail = (inv: InvoiceModel) => {
    setSelectedInvoice(inv);
    setIsDetailOpen(true);
  };

  const openPayment = (inv: InvoiceModel) => {
    setPaymentInvoice(inv);
    setIsPaymentOpen(true);
  };

  const totalLedgerAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalBalanceDue = invoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Automated Billing Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Trigger recurring billing cycles, inspect mathematical idempotency, and manage invoice lifecycles.
          </p>
        </div>

        <button
          onClick={handleTriggerRun}
          disabled={runningBilling}
          className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
        >
          {runningBilling ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing Billing Run...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Billing Now</span>
            </>
          )}
        </button>
      </div>

      {/* Telemetry Result Banner */}
      {lastTelemetry && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2 text-sky-400 font-semibold">
            <Zap className="w-4 h-4" />
            <span>Latest Execution Telemetry ({new Date(lastTelemetry.runTimestamp).toLocaleTimeString()}):</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-400 font-bold">Created: {lastTelemetry.invoicesCreated}</span>
            <span className="text-amber-400 font-bold">Skipped (Idempotent): {lastTelemetry.skippedDuplicates}</span>
            <span className="text-rose-400 font-bold">Failed: {lastTelemetry.failedCount}</span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-sans">Total Invoices Shown</div>
          <div className="text-xl font-bold text-white mt-1">{invoices.length}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-sans">Cumulative Billed Value</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">${totalLedgerAmount.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-sans">Total Outstanding Receivables</div>
          <div className="text-xl font-bold text-amber-400 mt-1">${totalBalanceDue.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-slate-500 px-2 flex items-center gap-1 font-mono">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {['ALL', 'DRAFT', 'CONFIRMED', 'PAID', 'OVERDUE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                statusFilter === st
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice or customer..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
            <span>Loading billing invoices ledger...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-600" />
            <p>No invoices found matching the current criteria.</p>
            <p className="text-xs text-slate-500">Click "Run Billing Now" to process active recurring subscriptions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-950/60">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {invoices.map((inv) => {
                  const bal = Number(inv.balanceDue);
                  const isOverdue = new Date(inv.dueDate) < new Date() && bal > 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-850/40">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <button
                          onClick={() => openDetail(inv)}
                          className="hover:text-sky-400 transition"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="text-white font-medium">{inv.customer?.firstName} {inv.customer?.lastName}</div>
                        {inv.customer?.companyName && (
                          <div className="text-[11px] text-slate-400">{inv.customer.companyName}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {inv.subscription?.subscriptionNumber || 'One-Time'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        ${Number(inv.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span className={bal > 0 ? (isOverdue ? 'text-rose-400' : 'text-amber-400') : 'text-emerald-400'}>
                          ${bal.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5 font-sans">
                          <button
                            onClick={() => openDetail(inv)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
                          >
                            Details
                          </button>
                          {bal > 0 && inv.status !== InvoiceStatus.CANCELLED && (
                            <button
                              onClick={() => openPayment(inv)}
                              className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRefresh={() => {
          setIsDetailOpen(false);
          fetchInvoices();
        }}
        onOpenPaymentModal={(inv) => {
          setIsDetailOpen(false);
          openPayment(inv);
        }}
      />

      {/* Payment Processing Modal */}
      <PaymentModal
        invoice={paymentInvoice}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentSuccess={() => {
          fetchInvoices();
        }}
      />
    </div>
  );
};
