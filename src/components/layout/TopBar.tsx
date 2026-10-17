import React from 'react';
import { PageId } from './Sidebar';
import { RefreshCw, Play, LogOut, Download } from 'lucide-react';
import { UserAccount } from '../../types';

interface TopBarProps {
  currentPage: PageId;
  onRefreshData: () => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  currentUser?: UserAccount | null;
  onSignOut?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  onRefreshData,
  onRunAnalysis,
  isAnalyzing,
  currentUser,
  onSignOut
}) => {
  const titles: Record<PageId, { section: string; title: string }> = {
    dashboard: { section: 'Intelligence', title: 'Overview Dashboard' },
    explorer: { section: 'Intelligence', title: 'Review Explorer & Ingestion' },
    issues: { section: 'Intelligence', title: 'Issue Intelligence & Citations' },
    products: { section: 'Intelligence', title: 'Product Quality Explorer' },
    actions: { section: 'Decisions', title: 'Action Center' },
    decisions: { section: 'Decisions', title: 'Decision History & Scope Negotiation' },
    evaluation: { section: 'Benchmark', title: 'Evaluation Lab (Case C01)' },
    planner: { section: 'Commercial', title: 'D2C Merchant Business Planner' },
    discovery: { section: 'Commercial', title: 'Customer Discovery (3 Quality Leads)' },
    pilots: { section: 'Commercial', title: 'Pilot Experiments (30-Day Trial)' },
    reports: { section: 'System', title: 'Executive Reports & Safe Exports' },
    settings: { section: 'System', title: 'Settings & Workspace Configuration' }
  };

  const current = titles[currentPage] || { section: 'App', title: 'Review to Action' };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0">
      {/* Zone 1: Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap overflow-hidden">
        <span className="font-semibold text-indigo-600">MerchantIQ</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-400">{current.section}</span>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">{current.title}</span>
      </div>

      {/* Zone 2: Primary Action, Quick Controls, & User Session */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onRefreshData}
          title="Refresh store data"
          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <a
          href="/api/download-zip"
          download="merchantiq-intelligence-platform.zip"
          title="Download complete codebase ZIP archive"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline">Download</span> ZIP
        </a>

        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs whitespace-nowrap cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Feedback...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run AI Intelligence</span>
            </>
          )}
        </button>

        {/* User Account & Sign Out */}
        {currentUser && onSignOut && (
          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-200">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 leading-none">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                {currentUser.store_name}
              </span>
            </div>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Sign out of MerchantIQ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
