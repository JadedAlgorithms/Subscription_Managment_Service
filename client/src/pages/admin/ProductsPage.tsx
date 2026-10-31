import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Package,
  Plus,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Tag,
  X
} from 'lucide-react';
import { ProductModel, PlanModel, ProductType, BillingFrequency } from '../../types';

export const ProductsPage: React.FC = () => {
  const { token, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'products' | 'plans'>('products');
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [plans, setPlans] = useState<PlanModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [showProductModal, setShowProductModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Product Form State
  const [productForm, setProductForm] = useState({
    name: '',
    code: '',
    type: ProductType.SOFTWARE,
    salesPrice: 1200,
    costPrice: 300,
    notes: '',
    variantName: 'Odoo Enterprise Synchronization Connector',
    variantSku: 'BL-ERP-ODOO-560',
    variantSurcharge: 560,
  });

  // Variant Form State
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku: '',
    priceSurcharge: 0,
    notes: '',
  });

  // Plan Form State
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    description: '',
    billingFrequency: BillingFrequency.MONTHLY,
    minimumQuantity: 1,
    validityDays: 365,
    autoClose: false,
    allowPause: true,
    allowRenew: true,
    price: 1200,
    currency: 'USD',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, planRes] = await Promise.all([
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const prodData = await prodRes.json();
      const planData = await planRes.json();

      if (prodRes.ok) setProducts(prodData.data || []);
      if (planRes.ok) setPlans(planData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading catalog data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: productForm.name,
        code: productForm.code,
        type: productForm.type,
        salesPrice: Number(productForm.salesPrice),
        costPrice: Number(productForm.costPrice),
        notes: productForm.notes,
        variants: productForm.variantName
          ? [
              {
                name: productForm.variantName,
                sku: productForm.variantSku,
                priceSurcharge: Number(productForm.variantSurcharge),
              },
            ]
          : [],
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create product.');

      setSuccessMsg(`Product "${json.data.name}" added successfully.`);
      setShowProductModal(false);
      setProductForm({
        name: '',
        code: '',
        type: ProductType.SOFTWARE,
        salesPrice: 1200,
        costPrice: 300,
        notes: '',
        variantName: '',
        variantSku: '',
        variantSurcharge: 0,
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating product.');
    }
  };

  // Handle Add Variant
  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    setError(null);

    try {
      const res = await fetch(`/api/products/${selectedProductId}/variants`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variantForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add variant.');

      setSuccessMsg(`Variant "${json.data.name}" added successfully.`);
      setShowVariantModal(false);
      setVariantForm({ name: '', sku: '', priceSurcharge: 0, notes: '' });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding variant.');
    }
  };

  // Handle Create Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create plan.');

      setSuccessMsg(`Plan "${json.data.name}" created successfully.`);
      setShowPlanModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating plan.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Catalog & Billing Plans
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage base products, dynamic variant modifiers (e.g. +$560 for Odoo brand), and billing cadences.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === 'products' ? (
            <button
              onClick={() => setShowProductModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-sky-500/20 flex items-center space-x-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Product</span>
            </button>
          ) : (
            isAdmin && (
              <button
                onClick={() => setShowPlanModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-emerald-500/20 flex items-center space-x-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Billing Plan</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
            activeTab === 'products'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products & Dynamic Variants ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
            activeTab === 'plans'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Billing Plans & Cadence ({plans.length})</span>
        </button>
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

      {/* Tab 1: Products & Variants */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
              <span>Loading catalog products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
              No products found in the catalog. Click "New Product" to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-base sm:text-lg">{product.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 font-mono text-[11px] border border-sky-500/25">
                          {product.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                          {product.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{product.notes || 'No description notes provided.'}</p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Base Sales Price</div>
                        <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
                          ${Number(product.salesPrice).toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setShowVariantModal(true);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium flex items-center space-x-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5 text-sky-400" />
                        <span>Add Variant</span>
                      </button>
                    </div>
                  </div>

                  {/* Variants Section */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        <span>Configured Dynamic Variants ({product.variants.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {product.variants.map((v) => {
                          const surcharge = Number(v.priceSurcharge);
                          const total = Number(product.salesPrice) + surcharge;
                          return (
                            <div
                              key={v.id}
                              className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-white truncate max-w-[170px]">{v.name}</span>
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                                  {v.sku}
                                </span>
                              </div>
                              <div className="flex items-baseline justify-between text-xs font-mono">
                                <span className="text-slate-400 text-[11px]">
                                  Surcharge: {surcharge >= 0 ? `+$${surcharge.toFixed(2)}` : `-$${Math.abs(surcharge).toFixed(2)}`}
                                </span>
                                <span className="text-emerald-400 font-bold">
                                  Total: ${total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Billing Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
              <span>Loading subscription plans...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
              No subscription plans defined. Click "New Billing Plan" to configure one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[11px] font-semibold">
                        {plan.billingFrequency}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{plan.code}</span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {plan.description || 'Configured recurring cadence policy.'}
                      </p>
                    </div>

                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-extrabold text-white font-mono">
                        ${Number(plan.price).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400">/{plan.billingFrequency.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Lifecycle Rules Toggles Display */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Minimum Seats / Qty:</span>
                      <span className="font-mono text-white font-semibold">{plan.minimumQuantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Allow Pausing:</span>
                      <span className={plan.allowPause ? 'text-emerald-400 font-medium' : 'text-slate-600'}>
                        {plan.allowPause ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Allow Renewals:</span>
                      <span className={plan.allowRenew ? 'text-emerald-400 font-medium' : 'text-slate-600'}>
                        {plan.allowRenew ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Auto Close:</span>
                      <span className={plan.autoClose ? 'text-amber-400 font-medium' : 'text-slate-600'}>
                        {plan.autoClose ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create Product */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-400" /> New Product Definition
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Brightloop ERP Core"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Product Code / SKU</label>
                  <input
                    type="text"
                    required
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                    placeholder="PROD-ERP-CORE"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value as ProductType })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    {Object.values(ProductType).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sales Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.salesPrice}
                    onChange={(e) => setProductForm({ ...productForm, salesPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Initial Dynamic Variant Surcharge Section */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-sky-400 block flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Optional Initial Dynamic Variant (e.g. Odoo +$560)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={productForm.variantName}
                    onChange={(e) => setProductForm({ ...productForm, variantName: e.target.value })}
                    placeholder="Odoo Brand Connector"
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    value={productForm.variantSku}
                    onChange={(e) => setProductForm({ ...productForm, variantSku: e.target.value })}
                    placeholder="BL-ERP-ODOO"
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono uppercase"
                  />
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs font-mono">+$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.variantSurcharge}
                      onChange={(e) => setProductForm({ ...productForm, variantSurcharge: Number(e.target.value) })}
                      placeholder="560.00"
                      className="w-full pl-7 pr-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-emerald-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-medium shadow-md shadow-sky-500/20 transition"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Variant */}
      {showVariantModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-400" /> Add Dynamic Variant
              </h3>
              <button
                onClick={() => setShowVariantModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVariant} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Variant Name</label>
                <input
                  type="text"
                  required
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  placeholder="e.g. Odoo Brand Synchronization"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Variant SKU</label>
                  <input
                    type="text"
                    required
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                    placeholder="BL-ODOO-MOD"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price Surcharge ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs font-mono">+$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={variantForm.priceSurcharge}
                      onChange={(e) => setVariantForm({ ...variantForm, priceSurcharge: Number(e.target.value) })}
                      placeholder="560.00"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVariantModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-medium shadow-md shadow-sky-500/20 transition"
                >
                  Add Surcharge Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Plan */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" /> New Billing Plan
              </h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="Enterprise Monthly Plan"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Plan Code</label>
                  <input
                    type="text"
                    required
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                    placeholder="PLAN-ENT-MONTHLY"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cadence</label>
                  <select
                    value={planForm.billingFrequency}
                    onChange={(e) => setPlanForm({ ...planForm, billingFrequency: e.target.value as BillingFrequency })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    {Object.values(BillingFrequency).map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={planForm.minimumQuantity}
                    onChange={(e) => setPlanForm({ ...planForm, minimumQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Behavioral Policy Toggles */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Lifecycle Behavioral Toggles</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.allowPause}
                      onChange={(e) => setPlanForm({ ...planForm, allowPause: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span>Allow Pause</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.allowRenew}
                      onChange={(e) => setPlanForm({ ...planForm, allowRenew: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span>Allow Renew</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.autoClose}
                      onChange={(e) => setPlanForm({ ...planForm, autoClose: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                    />
                    <span>Auto Close</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-medium shadow-md shadow-emerald-500/20 transition"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
