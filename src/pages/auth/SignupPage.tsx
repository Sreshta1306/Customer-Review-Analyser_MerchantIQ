import React, { useState, useEffect } from 'react';
import { AuthLayout } from './AuthLayout';
import { GoogleLogo } from './GoogleLogo';
import { GoogleOAuthModal } from './GoogleOAuthModal';
import { auth } from '../../api/client';
import { UserAccount } from '../../types';
import {
  User,
  Mail,
  Store,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface SignupPageProps {
  onSuccess: (user: UserAccount) => void;
  onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onSuccess,
  onNavigateToLogin
}) => {
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Modals
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleConfig, setGoogleConfig] = useState<{ google_configured: boolean; google_client_id: string | null }>({
    google_configured: false,
    google_client_id: null
  });

  useEffect(() => {
    auth.getAuthConfig().then(setGoogleConfig).catch(() => {});
  }, []);

  // Compute password strength score (0-4)
  const computePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-indigo-500', textColor: 'text-indigo-600' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
      default:
        return { score: 0, label: 'Too short', color: 'bg-slate-200', textColor: 'text-slate-400' };
    }
  };

  const strength = computePasswordStrength(password);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    setErrorMessage(null);

    if (!name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Work email is required.';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid work email address.';
    }

    if (!storeName.trim()) {
      errors.storeName = 'Business or store name is required.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      errors.terms = 'You must accept the terms of service and privacy policy to continue.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await auth.register({
        name: name.trim(),
        email: email.trim(),
        store_name: storeName.trim(),
        password
      });
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="signup">
      <div className="space-y-5">
        
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#635BFF]" />
            <span className="text-[11px] font-semibold tracking-wider text-[#635BFF] uppercase">
              Get Started
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
            Create your MerchantIQ account
          </h1>
          <p className="text-xs text-[#64748B]">
            Start turning customer reviews into smarter business decisions.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Row 1: Full Name & Store Name (2 columns on sm) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Elena Rostova"
                  className={`w-full pl-8.5 pr-3 py-2 text-xs bg-white border rounded-xl text-[#172033] placeholder-[#94A3B8] transition-all focus:outline-none focus:ring-1 ${
                    fieldErrors.name
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-[#E2E8F0] focus:border-[#635BFF] focus:ring-[#635BFF]'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* Store / Business Name */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Business / Store Name
              </label>
              <div className="relative">
                <Store className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    if (fieldErrors.storeName) setFieldErrors((prev) => ({ ...prev, storeName: '' }));
                  }}
                  placeholder="Aeroflex Direct"
                  className={`w-full pl-8.5 pr-3 py-2 text-xs bg-white border rounded-xl text-[#172033] placeholder-[#94A3B8] transition-all focus:outline-none focus:ring-1 ${
                    fieldErrors.storeName
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-[#E2E8F0] focus:border-[#635BFF] focus:ring-[#635BFF]'
                  }`}
                />
              </div>
              {fieldErrors.storeName && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.storeName}</p>
              )}
            </div>
          </div>

          {/* Work Email */}
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="elena@aeroflex.com"
                className={`w-full pl-8.5 pr-3 py-2 text-xs bg-white border rounded-xl text-[#172033] placeholder-[#94A3B8] transition-all focus:outline-none focus:ring-1 ${
                  fieldErrors.email
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-[#E2E8F0] focus:border-[#635BFF] focus:ring-[#635BFF]'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* Row 2: Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="Min. 8 chars"
                  className={`w-full pl-8.5 pr-8 py-2 text-xs bg-white border rounded-xl text-[#172033] placeholder-[#94A3B8] transition-all focus:outline-none focus:ring-1 ${
                    fieldErrors.password
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-[#E2E8F0] focus:border-[#635BFF] focus:ring-[#635BFF]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#172033] transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Re-enter password"
                  className={`w-full pl-8.5 pr-8 py-2 text-xs bg-white border rounded-xl text-[#172033] placeholder-[#94A3B8] transition-all focus:outline-none focus:ring-1 ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-[#E2E8F0] focus:border-[#635BFF] focus:ring-[#635BFF]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#172033] transition-colors"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Password Strength Guidance Meter */}
          {password.length > 0 && (
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#635BFF]" />
                  Password strength:
                </span>
                <span className={`font-semibold ${strength.textColor}`}>
                  {strength.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`rounded-full h-full transition-all duration-300 ${
                      step <= strength.score ? strength.color : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#64748B] leading-tight">
                Use 8+ characters with uppercase letters, numbers, and symbols.
              </p>
            </div>
          )}

          {/* Terms & Privacy Acceptance Checkbox */}
          <div className="pt-1">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (fieldErrors.terms) setFieldErrors((prev) => ({ ...prev, terms: '' }));
                }}
                className="w-3.5 h-3.5 mt-0.5 rounded border-[#E2E8F0] text-[#635BFF] focus:ring-[#635BFF] cursor-pointer"
              />
              <label htmlFor="agreeTerms" className="text-[11px] text-[#64748B] leading-snug cursor-pointer select-none">
                I agree to the{' '}
                <span className="text-[#172033] font-semibold underline underline-offset-2">Terms of Service</span>
                {' '}and{' '}
                <span className="text-[#172033] font-semibold underline underline-offset-2">Privacy Policy</span>.
              </label>
            </div>
            {fieldErrors.terms && (
              <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.terms}</p>
            )}
          </div>

          {/* Primary Create Account Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#635BFF] hover:bg-indigo-600 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating your account...</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-3">
          <div className="w-full border-t border-[#E2E8F0]" />
          <span className="bg-white px-3 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider absolute">
            OR
          </span>
        </div>

        {googleConfig.google_configured && (
          <button
            type="button"
            onClick={() => setIsGoogleModalOpen(true)}
            className="w-full py-2 px-4 bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#172033] text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <GoogleLogo className="w-4 h-4 shrink-0" />
            <span>Continue with Google</span>
          </button>
        )}

        {/* Navigation to Login */}
        <div className="text-center pt-1">
          <p className="text-xs text-[#64748B]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="font-semibold text-[#635BFF] hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>

      </div>

      {/* Google OAuth Modal */}
      <GoogleOAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        isConfigured={googleConfig.google_configured}
        clientId={googleConfig.google_client_id}
      />
    </AuthLayout>
  );
};
