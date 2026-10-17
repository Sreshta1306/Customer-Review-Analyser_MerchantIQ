import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = ''
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset Your MerchantIQ Password"
      subtitle="Enter your work email address to receive password recovery instructions"
      maxWidth="sm"
    >
      <div className="space-y-4 text-xs text-[#172033]">
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#635BFF] focus:border-[#635BFF] transition-all"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-[11px] text-[#64748B] leading-relaxed">
              <strong>Notice:</strong> Outbound password reset emails require an active transactional mail server integration (e.g. SMTP/Resend). If testing this sandbox, use the pre-configured Demo Account or register a new workspace account.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 text-xs font-medium text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#635BFF] hover:bg-indigo-600 rounded-lg transition-colors shadow-2xs"
              >
                Send Reset Link
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-center py-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-[#172033]">Reset Instructions Dispatched</h4>
            <p className="text-xs text-[#64748B] leading-relaxed">
              If an account is associated with <strong className="text-[#172033]">{email}</strong>, a secure recovery token has been queued. Please check your inbox and spam folder.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 text-xs font-semibold text-[#172033] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
