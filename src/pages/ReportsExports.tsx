import React, { useState, useEffect } from 'react';
import { api, DashboardStats } from '../api/client';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { LoadingSkeleton } from '../components/common/EmptyState';

export const ReportsExports: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [s, i, a, d] = await Promise.all([
        api.getStats(),
        api.getIssues(),
        api.getActions(),
        api.getDecisions()
      ]);
      setStats(s);
      setIssues(i.issues);
      setActions(a.actions);
      setDecisions(d.decisions);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !stats) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 print:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Reports & Sanitized Exports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compile executive summaries, audit logs, and export CSV/JSON with formula injection protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <a
            href="/api/export/csv"
            download
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download CSV (Safe)</span>
          </a>

          <a
            href="/api/export/json"
            download
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export JSON</span>
          </a>

          <a
            href="/api/download-zip"
            download="review-to-action-merchant-copilot.zip"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Download Project Zip</span>
          </a>
        </div>
      </div>

      {/* Security Protection Notice */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2 text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            <strong>Spreadsheet Injection Protection Active:</strong> CSV export automatically neutralizes leading formula triggers (<code className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded text-slate-800">=</code>, <code className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded text-slate-800">+</code>, <code className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded text-slate-800">-</code>, <code className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded text-slate-800">@</code>).
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">RFC 4180 Compliant</span>
      </div>

      {/* Printable Executive Report Sheet */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-2xs space-y-6">
        {/* Report Document Header */}
        <div className="border-b border-slate-200 pb-5 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-indigo-600 uppercase block mb-1">
              EXECUTIVE QUALITY AUDIT REPORT
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Review to Action — Quality Intelligence Briefing
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Dataset: Starter_Data/C01/fixture.json · Generated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Fynd × NMIMS Hackathon</div>
            <div>Problem Statement C01</div>
          </div>
        </div>

        {/* Section 1: Executive KPI Reconciled Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            1. Data Volume & Deduplication Audit
          </h3>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Total Raw Ingested:</span>
              <strong className="text-base font-mono text-slate-900">{stats.total_imported_records} records</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Reconciled Unique Cases:</span>
              <strong className="text-base font-mono text-emerald-700">{stats.valid_unique_reviews} reviews</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Confirmed Duplicates:</span>
              <strong className="text-base font-mono text-amber-700">{stats.confirmed_duplicates} records</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Detected Issue Groups:</span>
              <strong className="text-base font-mono text-indigo-700">{stats.issues_detected_count} groups</strong>
            </div>
          </div>
        </div>

        {/* Section 2: Top 3 Issues with Evidence */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            2. Top 3 Priority Defects & Customer Citations
          </h3>
          <div className="space-y-3">
            {issues.slice(0, 3).map((iss, idx) => (
              <div key={iss.category} className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-600">RANK #{idx + 1}</span>
                    <strong className="text-slate-900">{iss.title}</strong>
                    <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700 uppercase">
                      Severity: {iss.severity}
                    </span>
                  </div>
                  <span className="text-slate-500">
                    Owner: <strong>{iss.default_owner_team}</strong>
                  </span>
                </div>
                <p className="text-slate-700">{iss.description}</p>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Verified Customer Quote Evidence:
                  </span>
                  <div className="space-y-1">
                    {iss.supporting_citations.slice(0, 2).map((cit: any) => (
                      <p key={cit.review_id} className="italic text-slate-800 font-serif">
                        "{cit.quote}" ({cit.review_id} · Product {cit.product_id})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Original vs Negotiated Decisions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            3. Decision History: Original AI vs Negotiated Human Scope
          </h3>
          {decisions.map((dec) => (
            <div key={dec.decision_id} className="p-4 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-mono font-bold text-indigo-600">{dec.decision_id}</span>
                <span>Decided by: <strong>{dec.created_by}</strong></span>
              </div>
              <h4 className="font-bold text-slate-900">{dec.issue_title}</h4>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Original AI Recommendation:
                  </span>
                  <p className="text-slate-800">{dec.original_recommendation}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Scope: {dec.original_scope_product_ids.join(', ')}
                  </span>
                </div>
                <div className="p-2.5 bg-indigo-50/60 rounded border border-indigo-200">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 block mb-0.5">
                    Final Negotiated Decision:
                  </span>
                  <p className="text-indigo-950 font-semibold">{dec.final_corrective_action}</p>
                  <span className="text-[10px] text-indigo-700 mt-1 block">
                    Scope: {dec.final_scope_product_ids.join(', ')}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 italic bg-amber-50/50 p-2 rounded border border-amber-200/50">
                <strong>Business Rationale:</strong> "{dec.scope_change_reason}"
              </p>
            </div>
          ))}
        </div>

        {/* Section 4: Operational Limitations */}
        <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 space-y-1">
          <div className="font-semibold text-slate-700">Governance & Statistical Limitations:</div>
          <p>
            • Customer feedback triage represents qualitative investigation signals and does not establish verified defect rates without sales denominators.
          </p>
          <p>
            • Corrective actions are formulated as testable hypotheses and require physical sample verification before contractual factory penalties.
          </p>
        </div>
      </div>
    </div>
  );
};
