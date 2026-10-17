import React from 'react';
import { CheckCircle2, MessageSquareText } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: 'login' | 'signup';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, mode }) => {
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center text-[#172033] font-sans">
      <div className="w-full max-w-6xl mx-auto my-auto p-4 sm:p-6 lg:p-8">
        
        {/* Mobile Header: Visible only on < lg to prioritize the form */}
        <div className="lg:hidden flex items-center justify-between pb-4 px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#635BFF] flex items-center justify-center text-white font-bold text-sm shadow-xs">
              M
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#172033] block leading-none">
                MerchantIQ
              </span>
              <span className="text-[10px] font-medium text-[#64748B] block mt-0.5 tracking-wide">
                Quality Intelligence
              </span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#64748B] bg-slate-100 border border-[#E2E8F0] px-2.5 py-1 rounded-lg">
            {mode === 'login' ? 'Merchant Portal' : 'New Workspace'}
          </span>
        </div>

        {/* Main Two-Column Card Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden min-h-[620px]">
          
          {/* Left Panel: Desktop Value Proposition & Visual (Light & Minimal) */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] border-r border-[#E2E8F0] p-8 sm:p-10 flex-col justify-between">
            {/* Brand Header */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#635BFF] flex items-center justify-center text-white font-bold text-base shadow-xs">
                  M
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight text-[#172033] block leading-none">
                    MerchantIQ
                  </span>
                  <span className="text-[11px] font-medium text-[#64748B] block mt-1 tracking-wide">
                    Merchant Quality Intelligence
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172033] leading-snug">
                  Customer feedback, transformed into action.
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
                  Turn customer reviews into traceable root-cause evidence, prioritize defects, and drive verified corrective actions.
                </p>
              </div>
            </div>

            {/* Abstract Visual Representation: Review -> Issue Detection -> Action */}
            <div className="my-6 p-4.5 bg-white/95 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9] text-xs">
                <span className="font-semibold text-[#172033] flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5 text-[#635BFF]" />
                  Unstructured Review
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Traceable Evidence
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] italic font-serif">
                "Shoes arrived damaged and the size runs too small."
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                <div className="bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[9px] uppercase tracking-wider font-semibold">Defect 1</span>
                  <strong className="text-[#172033] text-[11px]">Product Damage</strong>
                </div>
                <div className="bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[9px] uppercase tracking-wider font-semibold">Defect 2</span>
                  <strong className="text-[#172033] text-[11px]">Incorrect Sizing</strong>
                </div>
              </div>
            </div>

            {/* 3 Core Value Points */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 text-[#635BFF]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <strong className="text-[#172033] font-semibold block">Detect recurring product issues</strong>
                  <span className="text-[#64748B]">Isolate transit damage, sizing anomalies, and factory flaws.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 text-[#635BFF]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <strong className="text-[#172033] font-semibold block">Prioritise defects using evidence</strong>
                  <span className="text-[#64748B]">Composite severity scoring with safety hazard overrides.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 text-[#635BFF]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <strong className="text-[#172033] font-semibold block">Turn insights into corrective actions</strong>
                  <span className="text-[#64748B]">Hypothesis-driven remediation with cross-team accountability.</span>
                </div>
              </div>
            </div>

            {/* Footer Trust Marker */}
            <div className="pt-6 border-t border-[#E2E8F0]/80 mt-6 flex items-center justify-between text-[11px] text-[#64748B]">
              <span className="font-medium">Enterprise Quality Copilot</span>
              <span>© {new Date().getFullYear()} MerchantIQ</span>
            </div>
          </div>

          {/* Right Panel: Form Viewport (Centered, 400-440px wide, clean spacing) */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex items-center justify-center">
            <div className="w-full max-w-[420px]">
              {children}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
