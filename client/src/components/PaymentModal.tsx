import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { InvoiceModel, PaymentMethod } from '../types';

interface PaymentModalProps {
  invoice: InvoiceModel | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const { token } = useAuth();

  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CREDIT_CARD);
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setAmount(Number(invoice.balanceDue));
      setTransactionReference(`TXN-${Date.now().toString().slice(-6)}`);
      setError(null);
      setSuccess(null);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const balanceDue = Number(invoice.balanceDue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (amount <= 0) {
      setError('Payment amount must be greater than $0.00.');
      return;
    }

    if (amount > balanceDue + 0.001) {
      setError(`Payment cannot exceed the outstanding balance due of $${balanceDue.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: Number(amount),
          paymentMethod,
          transactionReference,
          auditNotes,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to record payment.');
      }

      setSuccess(`Payment of $${Number(amount).toFixed(2)} recorded successfully.`);
      setTimeout(() => {
        onPaymentSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Payment</h3>
              <p className="text-xs text-slate-400 font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary Box */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Customer:</span>
            <span className="text-white font-sans font-medium">{invoice.customer?.firstName} {invoice.customer?.lastName}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Invoice Total:</span>
            <span className="text-slate-200">${Number(invoice.totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Amount Paid:</span>
            <span className="text-slate-200">${Number(invoice.amountPaid).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
            <span className="text-white">Balance Due:</span>
            <span className="text-emerald-400">${balanceDue.toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value={PaymentMethod.CREDIT_CARD}>Credit Card</option>
              <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (ACH / Wire)</option>
              <option value={PaymentMethod.DEBIT_CARD}>Debit Card</option>
              <option value={PaymentMethod.CASH}>Cash Settlement</option>
              <option value={PaymentMethod.CHECK}>Corporate Check</option>
              <option value={PaymentMethod.ONLINE_GATEWAY}>Online Payment Gateway</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Payment Amount ($)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs font-mono">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balanceDue}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Transaction Reference</label>
            <input
              type="text"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="e.g. ACH-98214 or CHK-4421"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Audit Notes (Optional)</label>
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="Reconciled via corporate ledger"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm Payment (${amount.toFixed(2)})</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

