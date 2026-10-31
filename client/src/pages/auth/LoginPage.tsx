import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Zap, Lock, Mail, AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === UserRole.CUSTOMER) {
        navigate('/portal/subscriptions', { replace: true });
      } else {
        navigate('/admin/products', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials provided.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 items-center justify-center shadow-lg shadow-sky-500/25 mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign In to Brightloop
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Subscription Engine & Customer Billing Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-950/50 space-y-6">
          {error && (
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-xs text-sky-400 hover:text-sky-300 transition">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Presets */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Quick Test Account Fill:</span>
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin@brightloop.io', 'BrightloopAdmin@2026')}
                className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-purple-400 text-center transition"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('staff@brightloop.io', 'BrightloopStaff@2026')}
                className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-blue-400 text-center transition"
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('billing@acmecorp.com', 'AcmeCustomer@2026')}
                className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-emerald-400 text-center transition"
              >
                Customer
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400">
          New customer?{' '}
          <Link to="/register" className="font-semibold text-sky-400 hover:text-sky-300 transition">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

