import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Printer,
  CreditCard,
  Send,
  AlertCircle,
  CheckCircle2,
  Check,
  Ban,
  Loader2,
  Receipt
} from 'lucide-react';
import { InvoiceModel, InvoiceStatus } from '../types';

interface InvoiceDetailModalProps {
  invoice: InvoiceModel | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenPaymentModal: (invoice: InvoiceModel) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onRefresh,
  onOpenPaymentModal,
}) => {
  const { token, isAdmin } = useAuth();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

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

  const handleConfirm = async () => {
    setLoadingAction('confirm');
    setError(null);
    try {
      const res = await fetch(`/api/billing/invoices/${invoice.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to confirm invoice.');
      setSuccess('Invoice confirmed successfully.');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error confirming invoice.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSend = async () => {
    setLoadingAction('send');
    setError(null);
    try {
      const res = await fetch(`/api/billing/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to dispatch invoice.');
      setSuccess(`Invoice dispatched to ${invoice.customer?.email}.`);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending invoice.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(`Are you sure you want to cancel Invoice ${invoice.invoiceNumber}?`)) return;
    setLoadingAction('cancel');
    setError(null);
    try {
      const res = await fetch(`/api/billing/invoices/${invoice.id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Administrative cancellation via Billing Center.' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to cancel invoice.');
      setSuccess('Invoice cancelled successfully.');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cancelling invoice.');
    } finally {
      setLoadingAction(null);
    }
  };

  const balanceDue = Number(invoice.balanceDue);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white font-mono">{invoice.invoiceNumber}</h2>
                <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Subscription: <span className="font-mono text-slate-200">{invoice.subscription?.subscriptionNumber || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
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

        {/* Invoice Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="space-y-1">
            <span className="text-slate-500 block">Customer Information:</span>
            <div className="text-white font-semibold text-sm font-sans">{invoice.customer?.firstName} {invoice.customer?.lastName}</div>
            {invoice.customer?.companyName && (
              <div className="text-slate-300 font-sans">{invoice.customer.companyName}</div>
            )}
            <div className="text-slate-400">{invoice.customer?.email}</div>
          </div>

          <div className="space-y-1 text-left sm:text-right">
            <span className="text-slate-500 block">Billing Period & Dates:</span>
            <div className="text-slate-200">
              Period: {new Date(invoice.billingPeriodStart).toLocaleDateString()} - {new Date(invoice.billingPeriodEnd).toLocaleDateString()}
            </div>
            <div className="text-slate-400">Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</div>
            <div className="text-amber-400 font-semibold">Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-semibold">
            Invoiced Line Items
          </span>
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Tax</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoice.lineItems && invoice.lineItems.length > 0 ? (
                  invoice.lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-850/30">
                      <td className="py-3 px-3 text-white font-sans">{item.description}</td>
                      <td className="py-3 px-3 text-center text-slate-300">{item.quantity}</td>
                      <td className="py-3 px-3 text-right text-slate-300">${Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-slate-400">${Number(item.taxAmount).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">${Number(item.totalAmount).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500">
                      Standard recurring subscription service cycle
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal:</span>
            <span>${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Tax Amount:</span>
            <span>+${Number(invoice.taxAmount).toFixed(2)}</span>
          </div>
          {Number(invoice.discountAmount) > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Auto-Applied Discount:</span>
              <span>-${Number(invoice.discountAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-300 font-bold pt-1 border-t border-slate-800">
            <span>Invoice Total:</span>
            <span>${Number(invoice.totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Cumulative Amount Paid:</span>
            <span>-${Number(invoice.amountPaid).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1.5 border-t border-slate-800">
            <span className="text-white">Balance Due:</span>
            <span className={balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}>
              ${balanceDue.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="space-y-2 text-xs font-mono">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Recorded Payments History
            </span>
            <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800/60 p-3">
              {invoice.payments.map((p) => (
                <div key={p.id} className="py-2 flex justify-between items-center text-slate-300">
                  <div>
                    <span className="text-white font-medium">{p.paymentNumber}</span> • {p.paymentMethod}
                    {p.transactionReference && <span className="text-slate-500 ml-1.5">(Ref: {p.transactionReference})</span>}
                    <div className="text-[11px] text-slate-500">Paid: {new Date(p.paidAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-emerald-400 font-bold text-sm">
                    ${Number(p.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div>
            {invoice.status !== InvoiceStatus.CANCELLED && invoice.status !== InvoiceStatus.PAID && isAdmin && (
              <button
                onClick={handleCancel}
                disabled={loadingAction === 'cancel'}
                className="px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Invoice</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            {invoice.status === InvoiceStatus.DRAFT && (
              <button
                onClick={handleConfirm}
                disabled={loadingAction === 'confirm'}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition"
              >
                {loadingAction === 'confirm' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm Invoice</span>
              </button>
            )}

            <button
              onClick={handleSend}
              disabled={loadingAction === 'send'}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Send Invoice</span>
            </button>

            {balanceDue > 0 && invoice.status !== InvoiceStatus.CANCELLED && (
              <button
                onClick={() => onOpenPaymentModal(invoice)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

