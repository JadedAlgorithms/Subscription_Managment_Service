import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail, Lock, KeyRound, AlertCircle, CheckCircle2, ArrowRight, Loader2, Check, X } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordCriteria = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
    { label: 'At least one special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
  ];

  const isPasswordValid = passwordCriteria.every((c) => c.met);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to request password reset.');
      }

      if (json.data?.resetToken) {
        setToken(json.data.resetToken);
        setStatusMessage('Reset token generated! Enter your new password below.');
        setStep('reset');
      } else {
        setStatusMessage(json.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating reset token.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Please satisfy all password complexity rules.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to reset password.');
      }

      setStatusMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 items-center justify-center shadow-lg shadow-sky-500/25 mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {step === 'request' ? 'Reset Password' : 'Set New Password'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            {step === 'request'
              ? 'Enter your registered email to receive a secure token.'
              : 'Enter your verification token and create a new password.'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-950/50 space-y-6">
          {error && (
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestToken} className="space-y-4">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Issuing Token...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Reset Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Security Token</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste reset token here"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-mono text-slate-400 block font-medium">Policy Checklist:</span>
                {passwordCriteria.map((c, i) => (
                  <div
                    key={i}
                    className={`text-[11px] flex items-center space-x-1.5 ${
                      c.met ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {c.met ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isPasswordValid}
                className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-sky-400 hover:text-sky-300 transition">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

