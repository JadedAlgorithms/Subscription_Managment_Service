import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  PauseCircle,
  RotateCcw,
  XCircle,
  PlayCircle
} from 'lucide-react';
import {
  SubscriptionModel,
  ProductModel,
  PlanModel,
  SubscriptionStatus,
} from '../../types';

interface CustomerOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
  code: string;
  planId: string;
  defaultPaymentTerms: string;
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    discountPct: number | string;
  }[];
}

interface BuilderLineItem {
  productId: string;
  variantId: string;
  quantity: number;
  discountAmount: number;
  notes: string;
}

export const SubscriptionBuilderPage: React.FC = () => {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'builder' | 'directory'>('builder');
  const [subscriptions, setSubscriptions] = useState<SubscriptionModel[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [plans, setPlans] = useState<PlanModel[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [initialStatus, setInitialStatus] = useState<SubscriptionStatus>(SubscriptionStatus.QUOTATION);

  const [lineItems, setLineItems] = useState<BuilderLineItem[]>([
    { productId: '', variantId: '', quantity: 1, discountAmount: 0, notes: '' },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, custRes, prodRes, planRes, tmplRes] = await Promise.all([
        fetch('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/auth/customers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/templates', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const subsData = await subsRes.json();
      const custData = await custRes.json();
      const prodData = await prodRes.json();
      const planData = await planRes.json();
      const tmplData = await tmplRes.json();

      if (subsRes.ok) setSubscriptions(subsData.data || []);
      if (custRes.ok) {
        setCustomers(custData.data || []);
        if (custData.data?.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custData.data[0].id);
        }
      }
      if (prodRes.ok) {
        setProducts(prodData.data || []);
        if (prodData.data?.length > 0 && !lineItems[0].productId) {
          setLineItems([
            {
              productId: prodData.data[0].id,
              variantId: prodData.data[0].variants?.[0]?.id || '',
              quantity: 1,
              discountAmount: 0,
              notes: '',
            },
          ]);
        }
      }
      if (planRes.ok) {
        setPlans(planData.data || []);
        if (planData.data?.length > 0 && !selectedPlanId) {
          setSelectedPlanId(planData.data[0].id);
        }
      }
      if (tmplRes.ok) setTemplates(tmplData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading subscription data.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedCustomerId, selectedPlanId, lineItems]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load from template handler
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    setSelectedPlanId(tmpl.planId);
    setPaymentTerms(tmpl.defaultPaymentTerms);

    if (tmpl.items && tmpl.items.length > 0) {
      setLineItems(
        tmpl.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || '',
          quantity: i.quantity || 1,
          discountAmount: 0,
          notes: '',
        }))
      );
    }
  };

  // Add line item
  const addLineItem = () => {
    if (products.length === 0) return;
    setLineItems([
      ...lineItems,
      {
        productId: products[0].id,
        variantId: products[0].variants?.[0]?.id || '',
        quantity: 1,
        discountAmount: 0,
        notes: '',
      },
    ]);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof BuilderLineItem, value: unknown) => {
    const updated = [...lineItems];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index] = {
        ...updated[index],
        productId: value as string,
        variantId: prod?.variants?.[0]?.id || '',
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setLineItems(updated);
  };

  // Calculate live line item totals
  const calculatedItems = lineItems.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const basePrice = Number(product?.salesPrice || 0);
    const variant = product?.variants?.find((v) => v.id === item.variantId);
    const surcharge = Number(variant?.priceSurcharge || 0);
    const unitPrice = basePrice + surcharge;
    const subtotal = unitPrice * Math.max(1, item.quantity);
    const tax = ((subtotal - Number(item.discountAmount || 0)) * 8.25) / 100;
    const total = subtotal - Number(item.discountAmount || 0) + tax;

    return {
      basePrice,
      surcharge,
      unitPrice,
      subtotal,
      tax,
      total,
    };
  });

  const grandSubtotal = calculatedItems.reduce((acc, i) => acc + i.subtotal, 0);
  const grandDiscount = lineItems.reduce((acc, i) => acc + Number(i.discountAmount || 0), 0);
  const grandTax = calculatedItems.reduce((acc, i) => acc + i.tax, 0);
  const grandTotal = grandSubtotal - grandDiscount + grandTax;

  // Handle Form Submission
  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        customerId: selectedCustomerId,
        planId: selectedPlanId,
        status: initialStatus,
        paymentTerms,
        startDate,
        notes,
        lineItems: lineItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || undefined,
          quantity: Number(i.quantity),
          discountAmount: Number(i.discountAmount),
          notes: i.notes,
        })),
      };

      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create subscription.');

      setSuccessMsg(`Quotation/Subscription ${json.data.subscriptionNumber} generated!`);
      setActiveTab('directory');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // State Machine Transition Trigger
  const handleTransition = async (id: string, targetStatus: SubscriptionStatus) => {
    setError(null);
    try {
      const res = await fetch(`/api/subscriptions/${id}/transition`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetStatus, actionNotes: `Transitioned to ${targetStatus}` }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Transition failed.');

      setSuccessMsg(json.message);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during transition.');
    }
  };

  // Lifecycle Action Trigger (Pause / Renew / Close)
  const handleLifecycle = async (id: string, action: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/subscriptions/${id}/lifecycle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lifecycle action failed.');

      setSuccessMsg(json.message);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error executing lifecycle action.');
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.DRAFT:
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case SubscriptionStatus.QUOTATION:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case SubscriptionStatus.CONFIRMED:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case SubscriptionStatus.ACTIVE:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case SubscriptionStatus.CLOSED:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Quote-to-Cash Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Build interactive quotes with dynamic variants, enforce plan cadence, and drive the lifecycle state machine.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
              activeTab === 'builder'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Quotation Builder
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
              activeTab === 'directory'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Active Directory ({subscriptions.length})
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

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: Quotation Builder */}
      {activeTab === 'builder' && (
        <form onSubmit={handleCreateSubscription} className="space-y-6">
          {/* Card 1: Configuration Header */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" /> Header Configuration & Customer Linking
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Load from Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="">-- Choose Template (Optional) --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Customer Account</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} {c.companyName ? `(${c.companyName})` : ''} - {c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Billing Cadence Plan</label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${Number(p.price).toFixed(2)} / {p.billingFrequency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="Immediate">Immediate / Due on Receipt</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Line Items Builder */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> Line Items & Dynamic Price Calculation
              </h3>
              <button
                type="button"
                onClick={addLineItem}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium flex items-center space-x-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Product Line</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Variant (Dynamic Surcharge)</th>
                    <th className="py-2.5 px-3 w-20">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">Tax (8.25%)</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-2 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {lineItems.map((item, idx) => {
                    const currentProduct = products.find((p) => p.id === item.productId);
                    const calc = calculatedItems[idx];
                    return (
                      <tr key={idx} className="hover:bg-slate-850/40">
                        {/* Product Select */}
                        <td className="py-3 px-3">
                          <select
                            value={item.productId}
                            onChange={(e) => updateLineItem(idx, 'productId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} (${Number(p.salesPrice).toFixed(2)})</option>
                            ))}
                          </select>
                        </td>

                        {/* Variant Select */}
                        <td className="py-3 px-3">
                          <select
                            value={item.variantId}
                            onChange={(e) => updateLineItem(idx, 'variantId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          >
                            <option value="">No Variant ($0.00)</option>
                            {currentProduct?.variants?.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} (+${Number(v.priceSurcharge).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-3 text-right text-slate-300">
                          ${calc?.unitPrice.toFixed(2)}
                        </td>

                        {/* Subtotal */}
                        <td className="py-3 px-3 text-right text-slate-300">
                          ${calc?.subtotal.toFixed(2)}
                        </td>

                        {/* Tax */}
                        <td className="py-3 px-3 text-right text-slate-400">
                          ${calc?.tax.toFixed(2)}
                        </td>

                        {/* Line Total */}
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                          ${calc?.total.toFixed(2)}
                        </td>

                        {/* Delete */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            disabled={lineItems.length === 1}
                            className="text-slate-500 hover:text-rose-400 disabled:opacity-20 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary Box */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="w-full sm:w-1/2 space-y-2">
                <label className="block text-xs font-medium text-slate-400">Audit Notes / Terms</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter proposal details or customer requirements..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600"
                />
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 min-w-[280px] space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>${grandSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Tax (8.25%):</span>
                  <span>${grandTax.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-bold text-emerald-400">
                  <span>Total Amount:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Submission Actions */}
            <div className="flex justify-end items-center space-x-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                onClick={() => setInitialStatus(SubscriptionStatus.DRAFT)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                onClick={() => setInitialStatus(SubscriptionStatus.QUOTATION)}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Issuing Quotation...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Official Quotation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: Subscriptions & Quotation Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
              <span>Loading subscriptions...</span>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
              No subscription records located. Generate one using the Quotation Builder.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {subscriptions.map((sub) => {
                const totalVal = sub.lineItems?.reduce((sum, item) => sum + Number(item.totalAmount), 0) || 0;
                return (
                  <div
                    key={sub.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono font-bold text-white text-base sm:text-lg">
                            {sub.subscriptionNumber}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${getStatusBadge(sub.status)}`}>
                            {sub.status}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded font-mono">
                            {sub.paymentTerms}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Customer: <span className="text-white font-medium">{sub.customer?.firstName} {sub.customer?.lastName}</span>
                          {sub.customer?.companyName && ` (${sub.customer.companyName})`} • <span className="font-mono">{sub.customer?.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Calculated Value</div>
                          <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                            ${totalVal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Line Items Preview */}
                    {sub.lineItems && sub.lineItems.length > 0 && (
                      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                        {sub.lineItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center text-slate-300">
                            <span>
                              {item.quantity}x {item.product?.name}
                              {item.variant && <span className="text-sky-400 ml-1">({item.variant.name})</span>}
                            </span>
                            <span className="text-emerald-400 font-medium">${Number(item.totalAmount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* State Machine Transition Actions */}
                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500 font-mono">
                        Plan: {sub.plan?.name} • Frequency: {sub.plan?.billingFrequency}
                      </div>

                      <div className="flex items-center space-x-2">
                        {sub.status === SubscriptionStatus.DRAFT && (
                          <button
                            onClick={() => handleTransition(sub.id, SubscriptionStatus.QUOTATION)}
                            className="px-3 py-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Issue Quotation</span>
                          </button>
                        )}

                        {sub.status === SubscriptionStatus.QUOTATION && (
                          <button
                            onClick={() => handleTransition(sub.id, SubscriptionStatus.CONFIRMED)}
                            className="px-3 py-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Confirm Order</span>
                          </button>
                        )}

                        {sub.status === SubscriptionStatus.CONFIRMED && (
                          <button
                            onClick={() => handleTransition(sub.id, SubscriptionStatus.ACTIVE)}
                            className="px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Activate Service</span>
                          </button>
                        )}

                        {sub.status === SubscriptionStatus.ACTIVE && (
                          <>
                            {sub.plan?.allowPause && (
                              <button
                                onClick={() => handleLifecycle(sub.id, 'pause')}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                              >
                                <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                                <span>Pause</span>
                              </button>
                            )}

                            {sub.plan?.allowRenew && (
                              <button
                                onClick={() => handleLifecycle(sub.id, 'renew')}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                                <span>Renew</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleLifecycle(sub.id, 'close_early')}
                              className="px-3 py-1.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Close Early</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
