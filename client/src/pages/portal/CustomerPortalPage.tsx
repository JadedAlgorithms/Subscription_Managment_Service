import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarCheck2,
  Receipt,
  AlertCircle,
  Loader2,
  Printer,
  Download,
  X,
  CreditCard,
  Zap,
  PauseCircle,
  CheckCircle2
} from 'lucide-react';
import { generateInvoicePdf } from '../../utils/generateInvoicePdf';
import {
  SubscriptionModel,
  InvoiceModel,
  SubscriptionStatus,
  InvoiceStatus,
} from '../../types';
import { PaymentModal } from '../../components/PaymentModal';

interface CustomerPortalPageProps {
  initialTab?: 'subscriptions' | 'invoices';
}

export const CustomerPortalPage: React.FC<CustomerPortalPageProps> = ({ initialTab = 'subscriptions' }) => {
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices'>(initialTab);
  const [subscriptions, setSubscriptions] = useState<SubscriptionModel[]>([]);
  const [invoices, setInvoices] = useState<InvoiceModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceModel | null>(null);

  // Payment Modal State
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceModel | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);

  const fetchPortalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, invRes] = await Promise.all([
        fetch('/api/portal/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/portal/invoices', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const subsData = await subsRes.json();
      const invData = await invRes.json();

      if (subsRes.ok) setSubscriptions(subsData.data || []);
      if (invRes.ok) setInvoices(invData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching customer portal data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // Handle Pause / Lifecycle Toggle
  const handleLifecycleAction = async (subscriptionId: string, action: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/lifecycle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to execute ${action}.`);

      setSuccess(json.message);
      fetchPortalData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error during ${action}.`);
    }
  };

  const getSubStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case SubscriptionStatus.CONFIRMED:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case SubscriptionStatus.QUOTATION:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case SubscriptionStatus.DRAFT:
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case SubscriptionStatus.CLOSED:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
  };

  const getInvStatusBadge = (status: InvoiceStatus) => {
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

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Customer Self-Service Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Welcome, <span className="text-white font-medium">{user?.firstName} {user?.lastName}</span>
            {user?.companyName && ` (${user.companyName})`}. Manage recurring services and view invoices.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex space-x-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === 'subscriptions'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>My Subscriptions ({subscriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              activeTab === 'invoices'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>My Invoices ({invoices.length})</span>
          </button>
        </div>
      </div>

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

      {loading ? (
        <div className="p-16 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
          <span>Retrieving customer account records...</span>
        </div>
      ) : activeTab === 'subscriptions' ? (
        /* TAB 1: Subscriptions */
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
              You currently do not have any active subscriptions.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {subscriptions.map((sub) => {
                const totalAmt = sub.lineItems?.reduce((sum, item) => sum + Number(item.totalAmount), 0) || 0;
                return (
                  <div
                    key={sub.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-white text-lg">
                            {sub.subscriptionNumber}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getSubStatusBadge(sub.status)}`}>
                            {sub.status}
                          </span>
                          <span className="text-xs bg-slate-950 px-2 py-0.5 rounded text-slate-400 font-mono">
                            Plan: {sub.plan?.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Billing Frequency: <span className="text-slate-200 font-medium">{sub.plan?.billingFrequency}</span> • Terms: {sub.paymentTerms}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Recurring Price</div>
                        <div className="text-xl font-extrabold text-emerald-400 font-mono">
                          ${totalAmt.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Timeline & Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs font-mono">
                      <div>
                        <div className="text-slate-500 text-[11px]">Start Date</div>
                        <div className="text-slate-200">
                          {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'Immediate'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[11px]">Next Renewal</div>
                        <div className="text-sky-400 font-semibold">
                          {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[11px]">Auto Renew</div>
                        <div className={sub.autoRenew ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {sub.autoRenew ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[11px]">Allow Pause</div>
                        <div className={sub.plan?.allowPause ? 'text-emerald-400' : 'text-slate-600'}>
                          {sub.plan?.allowPause ? 'Eligible' : 'Not Allowed'}
                        </div>
                      </div>
                    </div>

                    {/* Subscribed Line Items */}
                    {sub.lineItems && sub.lineItems.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                          Subscribed Products & Services
                        </span>
                        <div className="divide-y divide-slate-800/60 text-xs font-mono">
                          {sub.lineItems.map((item) => (
                            <div key={item.id} className="py-2 flex items-center justify-between text-slate-300">
                              <div>
                                <span className="font-semibold text-white">{item.product?.name}</span>
                                {item.variant && (
                                  <span className="text-sky-400 ml-1.5 font-normal">
                                    [{item.variant.name} (+${Number(item.variant.priceSurcharge).toFixed(2)})]
                                  </span>
                                )}
                                <span className="text-slate-500 ml-2">x{item.quantity}</span>
                              </div>
                              <div className="text-emerald-400 font-bold">
                                ${Number(item.totalAmount).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Customer Self-Service Actions */}
                    {sub.status === SubscriptionStatus.ACTIVE && sub.plan?.allowPause && (
                      <div className="pt-3 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => handleLifecycleAction(sub.id, 'pause')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
                        >
                          <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Request Pause</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: Invoices */
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
              No invoices generated for this account yet.
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-950/60">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {invoices.map((inv) => {
                      const bal = Number(inv.balanceDue);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-850/40">
                          <td className="py-3 px-4 font-bold text-white">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(inv.issueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(inv.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getInvStatusBadge(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            ${Number(inv.totalAmount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={bal > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                              ${bal.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-medium transition"
                              >
                                View Breakdown
                              </button>
                              {bal > 0 && inv.status !== InvoiceStatus.CANCELLED && (
                                <button
                                  onClick={() => {
                                    setPaymentInvoice(inv);
                                    setIsPaymentOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-emerald-500/20 flex items-center space-x-1 transition"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay Online</span>
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
            </div>
          )}
        </div>
      )}

      {/* Invoice Breakdown Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">{selectedInvoice.invoiceNumber}</h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${getInvStatusBadge(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => generateInvoicePdf(selectedInvoice, user)}
                  className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 shadow-md shadow-sky-500/20 transition"
                  title="Download Branded PDF Invoice"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Breakdown Details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-slate-500 block">Billed To:</span>
                <div className="text-white font-semibold">{user?.firstName} {user?.lastName}</div>
                {user?.companyName && <div className="text-slate-400">{user.companyName}</div>}
                <div className="text-slate-400">{user?.email}</div>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-slate-500 block">Billing Period:</span>
                <div className="text-slate-300">
                  {new Date(selectedInvoice.billingPeriodStart).toLocaleDateString()} - {new Date(selectedInvoice.billingPeriodEnd).toLocaleDateString()}
                </div>
                <div className="text-slate-400">Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 ? (
                    selectedInvoice.lineItems.map((li) => (
                      <tr key={li.id}>
                        <td className="py-2.5 text-white">{li.description}</td>
                        <td className="py-2.5 text-center text-slate-300">{li.quantity}</td>
                        <td className="py-2.5 text-right text-slate-300">${Number(li.unitPrice).toFixed(2)}</td>
                        <td className="py-2.5 text-right font-bold text-white">${Number(li.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-slate-500">
                        Recurring subscription billing period item
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>${Number(selectedInvoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax:</span>
                <span>${Number(selectedInvoice.taxAmount).toFixed(2)}</span>
              </div>
              {Number(selectedInvoice.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Applied Discount:</span>
                  <span>-${Number(selectedInvoice.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Amount Paid:</span>
                <span>${Number(selectedInvoice.amountPaid).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Balance Due:</span>
                <span className={Number(selectedInvoice.balanceDue) > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  ${Number(selectedInvoice.balanceDue).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Online Settlement Button inside Modal */}
            {Number(selectedInvoice.balanceDue) > 0 && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setPaymentInvoice(selectedInvoice);
                    setSelectedInvoice(null);
                    setIsPaymentOpen(true);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center space-x-2 transition"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Now (${Number(selectedInvoice.balanceDue).toFixed(2)})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      <PaymentModal
        invoice={paymentInvoice}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentSuccess={() => {
          fetchPortalData();
        }}
      />
    </div>
  );
};
