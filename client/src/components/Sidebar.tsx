import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Layers,
  FileSpreadsheet,
  Receipt,
  UserCheck,
  Shield,
  FilePlus2,
  CalendarCheck2,
  TrendingUp,
  Tag,
  Zap
} from 'lucide-react';
import { UserRole } from '../types';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const isInternalStaff = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
      isActive
        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10'
        : 'text-slate-400 hover:text-white hover:bg-slate-850'
    }`;

  return (
    <aside className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 px-3 mb-2 flex items-center justify-between">
            <span>{isInternalStaff ? 'Operations Engine' : 'Customer Portal'}</span>
            {isInternalStaff ? (
              <Shield className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>

          <nav className="space-y-1">
            {isInternalStaff ? (
              <>
                <NavLink to="/admin/products" className={linkClass}>
                  <Package className="w-4 h-4 text-sky-400" />
                  <span>Products & Variants</span>
                </NavLink>

                <NavLink to="/admin/subscriptions/new" className={linkClass}>
                  <FilePlus2 className="w-4 h-4 text-amber-400" />
                  <span>Quote Builder</span>
                </NavLink>

                <NavLink to="/admin/subscriptions" className={linkClass}>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Subscriptions List</span>
                </NavLink>

                <NavLink to="/admin/billing" className={linkClass}>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Billing Center</span>
                </NavLink>

                <NavLink to="/admin/discounts" className={linkClass}>
                  <Tag className="w-4 h-4 text-indigo-400" />
                  <span>Discount Rules</span>
                </NavLink>

                <NavLink to="/admin/finance" className={linkClass}>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Finance Dashboard</span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/portal/subscriptions" className={linkClass}>
                  <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>My Subscriptions</span>
                </NavLink>

                <NavLink to="/portal/invoices" className={linkClass}>
                  <Receipt className="w-4 h-4 text-rose-400" />
                  <span>My Invoices</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Phase 3 Highlights Box */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-sky-400 font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>Phase 3 Engine</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {isInternalStaff
              ? 'Automated cron billing runner, mathematical idempotency, Recharts revenue analytics & payment reconciliation active.'
              : 'Self-service customer portal with online invoice settlement and subscription lifecycle management.'}
          </p>
        </div>
      </div>
    </aside>
  );
};

