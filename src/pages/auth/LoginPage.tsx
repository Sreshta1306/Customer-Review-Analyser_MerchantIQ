import React, { useState, useEffect } from 'react';
import { AuthLayout } from './AuthLayout';
import { GoogleLogo } from './GoogleLogo';
import { GoogleOAuthModal } from './GoogleOAuthModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { auth } from '../../api/client';
import { UserAccount } from '../../types';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface LoginPageProps {
  onSuccess: (user: UserAccount) => void;
  onNavigateToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateToSignup
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Modals
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [googleConfig, setGoogleConfig] = useState<{ google_configured: boolean; google_client_id: string | null }>({
    google_configured: false,
    google_client_id: null
  });

  useEffect(() => {
    auth.getAuthConfig().then(setGoogleConfig).catch(() => {});
  }, []);

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    setErrorMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Please enter your work email.');
      isValid = false;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid work email address (e.g. name@company.com).');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await auth.login({ email: email.trim(), password });
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="login">
      <div className="space-y-6">
        
        {/* Brand Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#635BFF]" />
              <span className="text-[11px] font-semibold tracking-wider text-[#635BFF] uppercase">
                Merchant Portal
              </span>
            </div>

          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
            Welcome back
          </h1>
          <p className="text-xs text-[#64748B]">
            Sign in to turn customer feedback into actionable insights.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Work Email Field */}
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="name@company.com"
                className={`w-full pl-9 pr-3 py-2 text-xs bg-white border rounded-xl text-[#172033] placeholder-[#94A3B8] transition-all focus:outline-none focus:ring-1 ${
                  emailError
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-[#E2E8F0] focus:border-[#635BFF] focus:ring-[#635BFF]'
                }`}
              />
            </div>
            {emailError && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">{emailError}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#172033]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] font-semibold text-[#635BFF] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="••••••••••••"
                className={`w-full pl-9 pr-10 py-2 text-xs bg-white border rounded-xl text-[#172033] placeholder-[#94A3B8] transition-all focus:outline-none focus:ring-1 ${
                  passwordError
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-[#E2E8F0] focus:border-[#635BFF] focus:ring-[#635BFF]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#172033] transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">{passwordError}</p>
            )}
          </div>

          {/* Primary Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#635BFF] hover:bg-indigo-600 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="w-full border-t border-[#E2E8F0]" />
          <span className="bg-white px-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider absolute">
            OR
          </span>
        </div>

        {googleConfig.google_configured && (
          <>
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#172033] text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <GoogleLogo className="w-4 h-4 shrink-0" />
              <span>Continue with Google</span>
            </button>
          </>
        )}

        {/* Navigation to Signup */}
        <div className="text-center pt-2">
          <p className="text-xs text-[#64748B]">
            New to MerchantIQ?{' '}
            <button
              type="button"
              onClick={onNavigateToSignup}
              className="font-semibold text-[#635BFF] hover:underline cursor-pointer"
            >
              Create an account
            </button>
          </p>
        </div>

      </div>

      {/* Google OAuth Documentation & Status Modal */}
      <GoogleOAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        isConfigured={googleConfig.google_configured}
        clientId={googleConfig.google_client_id}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={email}
      />
    </AuthLayout>
  );
};
