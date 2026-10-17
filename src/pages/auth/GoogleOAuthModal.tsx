import React from 'react';
import { Modal } from '../../components/common/Modal';
import { ShieldAlert, ExternalLink, KeyRound, CheckCircle2 } from 'lucide-react';

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
  clientId: string | null;
}

export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({
  isOpen,
  onClose,
  isConfigured,
  clientId
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Google Workspace OAuth Authentication"
      subtitle="Single Sign-On (SSO) configuration status for MerchantIQ"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs text-[#172033]">
        {isConfigured ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Google Identity Client ID Active</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-mono break-all">
              Client ID: {clientId}
            </p>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-amber-950">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Google Cloud OAuth Client ID Required</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Google Single Sign-On requires configuring an authorized OAuth Client ID in your Google Cloud project console.
            </p>
          </div>
        )}

        <div className="space-y-2 border-t border-[#E2E8F0] pt-3">
          <span className="font-semibold text-[#172033] block">
            Google Cloud Console Setup Instructions:
          </span>
          <ol className="space-y-1.5 text-[#64748B] list-decimal list-inside pl-1 leading-relaxed">
            <li>
              Go to <strong className="text-[#172033]">Google Cloud Console</strong> &gt; <em>APIs & Services</em> &gt; <em>Credentials</em>.
            </li>
            <li>Create an <strong className="text-[#172033]">OAuth 2.0 Client ID</strong> (Application type: <em>Web application</em>).</li>
            <li>
              Add your origin to <em>Authorized JavaScript origins</em>:
              <code className="block mt-0.5 p-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded font-mono text-[10px] text-indigo-700">
                {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.app'}
              </code>
            </li>
            <li>
              Set the key in your <code className="font-mono text-slate-800">.env</code> file:
              <code className="block mt-0.5 p-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded font-mono text-[10px] text-slate-800">
                GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
              </code>
            </li>
          </ol>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
          <span className="text-[11px] text-[#64748B]">
            In the meantime, sign in with work email & password.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#172033] hover:bg-slate-800 rounded-lg transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </Modal>
  );
};
