import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Tag,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ToggleLeft,
  ToggleRight,
  ShieldCheck
} from 'lucide-react';
import { DiscountRuleModel, DiscountType, DiscountScope, ProductModel } from '../../types';

export const DiscountsPage: React.FC = () => {
  const { token, isAdmin } = useAuth();

  const [discounts, setDiscounts] = useState<DiscountRuleModel[]>([]);
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form
  const [form, setForm] = useState({
    code: '',
    description: '',
    type: DiscountType.PERCENTAGE,
    value: 15,
    scope: DiscountScope.SUBSCRIPTION,
    targetProductId: '',
    minPurchaseAmount: 0,
    minQuantity: 1,
    maxUsage: 100,
    startDate: '',
    endDate: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [discRes, prodRes] = await Promise.all([
        fetch('/api/billing/discounts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const discData = await discRes.json();
      const prodData = await prodRes.json();

      if (discRes.ok) setDiscounts(discData.data || []);
      if (prodRes.ok) setProducts(prodData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching discount rules.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const payload = {
        code: form.code,
        description: form.description,
        type: form.type,
        value: Number(form.value),
        scope: form.scope,
        targetProductId: form.scope === DiscountScope.PRODUCT ? form.targetProductId : undefined,
        minPurchaseAmount: form.minPurchaseAmount ? Number(form.minPurchaseAmount) : undefined,
        minQuantity: Number(form.minQuantity),
        maxUsage: form.maxUsage ? Number(form.maxUsage) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };

      const res = await fetch('/api/billing/discounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create discount rule.');

      setSuccess(`Discount rule "${json.data.code}" created.`);
      setShowModal(false);
      setForm({
        code: '',
        description: '',
        type: DiscountType.PERCENTAGE,
        value: 15,
        scope: DiscountScope.SUBSCRIPTION,
        targetProductId: '',
        minPurchaseAmount: 0,
        minQuantity: 1,
        maxUsage: 100,
        startDate: '',
        endDate: '',
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating discount rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/billing/discounts/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to toggle status.');
      setSuccess(json.message);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error toggling rule status.');
    }
  };

  const activeRulesCount = discounts.filter((d) => d.isActive).length;
  const totalUsagesCount = discounts.reduce((sum, d) => sum + d.usageCount, 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Discount & Promotional Rules
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Admin-governed automated discount rules applied to recurring subscription billing cycles.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-sky-500/20 flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Discount Rule</span>
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-sans">Total Rules Configured</div>
          <div className="text-xl font-bold text-white mt-1">{discounts.length}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-sans">Active Eligible Rules</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{activeRulesCount}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-sans">Cumulative Times Applied</div>
          <div className="text-xl font-bold text-sky-400 mt-1">{totalUsagesCount}</div>
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

      {/* Discounts Ledger Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
            <span>Loading discount rules...</span>
          </div>
        ) : discounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Tag className="w-8 h-8 mx-auto text-slate-600" />
            <p>No promotional discount rules defined.</p>
            {isAdmin && <p className="text-xs text-slate-500">Click "New Discount Rule" to create one.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-950/60">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4 text-center">Usage Count</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isAdmin && <th className="py-3 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {discounts.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-850/40">
                    <td className="py-3.5 px-4 font-bold text-sky-400">{rule.code}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans max-w-xs truncate">
                      {rule.description || 'General discount rule'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{rule.type}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      {rule.type === DiscountType.PERCENTAGE ? `${Number(rule.value)}%` : `$${Number(rule.value).toFixed(2)}`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] border border-slate-800">
                        {rule.scope}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-300">
                      {rule.usageCount} {rule.maxUsage ? `/ ${rule.maxUsage}` : '(Unlimited)'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rule.isActive ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                        {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggle(rule.id)}
                          className="text-slate-400 hover:text-white transition"
                          title={rule.isActive ? 'Deactivate Rule' : 'Activate Rule'}
                        >
                          {rule.isActive ? (
                            <ToggleRight className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-600" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Discount Rule */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-sky-400" /> Create Discount Rule
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Coupon / Rule Code</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="ENTERPRISE20"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value={DiscountType.PERCENTAGE}>Percentage (%)</option>
                    <option value={DiscountType.FIXED}>Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 20% discount on long-term enterprise commitments"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Value {form.type === DiscountType.PERCENTAGE ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Scope</label>
                  <select
                    value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value as DiscountScope })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value={DiscountScope.SUBSCRIPTION}>Whole Subscription</option>
                    <option value={DiscountScope.PRODUCT}>Target Product Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Max Usages</label>
                  <input
                    type="number"
                    value={form.maxUsage}
                    onChange={(e) => setForm({ ...form, maxUsage: Number(e.target.value) })}
                    placeholder="100"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              {form.scope === DiscountScope.PRODUCT && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Product</label>
                  <select
                    value={form.targetProductId}
                    onChange={(e) => setForm({ ...form, targetProductId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Min Purchase ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.minPurchaseAmount}
                    onChange={(e) => setForm({ ...form, minPurchaseAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={form.minQuantity}
                    onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-500/20 flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Save Discount Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
