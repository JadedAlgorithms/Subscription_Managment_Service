import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Mail,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface FinanceMetricsResponse {
  summary: {
    activeSubscriptionsCount: number;
    mrr: number;
    arr: number;
    collectedThisMonth: number;
    totalOutstanding: number;
    totalOverdue: number;
    overdueInvoicesCount: number;
    currency: string;
  };
  overdueAging: {
    under30Days: number;
    thirtyToSixtyDays: number;
    overSixtyDays: number;
  };
  overdueList: {
    id: string;
    invoiceNumber: string;
    subscriptionNumber: string;
    customerName: string;
    companyName: string;
    customerEmail: string;
    phone: string;
    totalAmount: number;
    balanceDue: number;
    dueDate: string;
    agingDays: number;
    status: string;
  }[];
  revenueTrends: {
    month: string;
    billed: number;
    collected: number;
  }[];
  performance: {
    queryLatencyMs: number;
    slaCompliant: boolean;
  };
}

export const FinanceDashboardPage: React.FC = () => {
  const { token } = useAuth();

  const [data, setData] = useState<FinanceMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load finance metrics.');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching executive finance dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Performance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Finance Lead Executive Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time revenue visibility, MRR/ARR analytics, and high-performance debt chasing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {data && (
            <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Query Latency: {data.performance.queryLatencyMs}ms</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold">
                {data.performance.slaCompliant ? 'SLA <2s Met' : 'SLA Exceeded'}
              </span>
            </div>
          )}

          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 border border-slate-800 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="p-24 text-center text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-sky-500 mb-3" />
          <span className="font-mono text-sm">Aggregating real-time financial ledger metrics...</span>
        </div>
      ) : data ? (
        <>
          {/* High-Level Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: MRR & ARR */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Monthly Recurring Rev (MRR)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                ${data.summary.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between font-mono pt-2 border-t border-slate-800/80">
                <span>ARR Equivalent:</span>
                <span className="text-emerald-400 font-bold">
                  ${data.summary.arr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Card 2: Revenue Collected This Month */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Collected This Month</span>
                <DollarSign className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                ${data.summary.collectedThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between font-mono pt-2 border-t border-slate-800/80">
                <span>Active Subscriptions:</span>
                <span className="text-sky-400 font-bold">{data.summary.activeSubscriptionsCount} active</span>
              </div>
            </div>

            {/* Card 3: Unpaid Outstanding Receivables */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Pending Receivables</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono">
                ${data.summary.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between font-mono pt-2 border-t border-slate-800/80">
                <span>Confirmed & Invoiced</span>
                <span className="text-slate-300">Due on terms</span>
              </div>
            </div>

            {/* Card 4: Overdue Invoices Total */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Overdue Receivables</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-extrabold text-rose-400 font-mono">
                ${data.summary.totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between font-mono pt-2 border-t border-slate-800/80">
                <span>Overdue Invoices:</span>
                <span className="text-rose-400 font-bold">{data.summary.overdueInvoicesCount} invoices</span>
              </div>
            </div>
          </div>

          {/* Revenue Trends Chart (Recharts) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" /> Monthly Revenue Trend (Billed vs. Collected)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Trailing 6-month financial performance breakdown</p>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(val) => [`$${Number(val).toFixed(2)}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="billed" name="Billed Amount" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected Cash" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overdue Aging Buckets Cards */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Receivables Aging Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-sans">1 - 30 Days Overdue</div>
                <div className="text-xl font-bold text-amber-300 mt-1">
                  ${data.overdueAging.under30Days.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-sans">31 - 60 Days Overdue</div>
                <div className="text-xl font-bold text-orange-400 mt-1">
                  ${data.overdueAging.thirtyToSixtyDays.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 font-sans">60+ Days Overdue (Critical)</div>
                <div className="text-xl font-bold text-rose-400 mt-1">
                  ${data.overdueAging.overSixtyDays.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Invoices Chasing Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Overdue Debt Recovery Chasing Table ({data.overdueList.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">High-priority unpaid receivables past due date</p>
              </div>
            </div>

            {data.overdueList.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
                Zero overdue invoices! All confirmed invoices are settled or within payment terms.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-950/60">
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Customer & Company</th>
                      <th className="py-2.5 px-3">Contact Email</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-center">Due Date</th>
                      <th className="py-2.5 px-3 text-center">Aging Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {data.overdueList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/40">
                        <td className="py-3 px-3 font-bold text-white">{item.invoiceNumber}</td>
                        <td className="py-3 px-3 font-sans">
                          <div className="text-white font-medium">{item.customerName}</div>
                          <div className="text-[11px] text-slate-400">{item.companyName}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <a href={`mailto:${item.customerEmail}`} className="text-sky-400 hover:underline flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3" />
                            <span>{item.customerEmail}</span>
                          </a>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-rose-400">
                          ${item.balanceDue.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.agingDays > 60 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : item.agingDays > 30 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                            {item.agingDays} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
