import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, LogOut, User, Building } from 'lucide-react';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case UserRole.STAFF:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case UserRole.CUSTOMER:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
              Brightloop <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">Phase 2</span>
            </span>
            <p className="text-xs text-slate-400 hidden sm:block">Subscription Engine & Customer Portal</p>
          </div>
        </div>

        {/* Right User Actions */}
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white flex items-center justify-end gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.firstName} {user.lastName}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                {user.companyName && (
                  <>
                    <Building className="w-3 h-3 text-slate-500" />
                    <span className="truncate max-w-[150px]">{user.companyName}</span>
                    <span className="text-slate-600">•</span>
                  </>
                )}
                <span className="font-mono">{user.email}</span>
              </div>
            </div>

            <span className={`text-[11px] px-2.5 py-1 rounded-full font-mono font-bold border ${getRoleBadge(user.role)}`}>
              {user.role}
            </span>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};

