import React, { useState, useEffect } from 'react';
import { api, DashboardStats } from '../api/client';
import { PageId } from '../components/layout/Sidebar';
import { SeverityBadge, ActionStatusBadge } from '../components/common/Badge';
import { LoadingSkeleton } from '../components/common/EmptyState';
import {
  FileText,
  CheckCircle,
  Copy,
  AlertTriangle,
  Flame,
  Clock,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface OverviewDashboardProps {
  onNavigate: (page: PageId) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onNavigate,
  onRunAnalysis,
  isAnalyzing
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getStats();
      const revs = await api.getReviews({ include_duplicates: true });
      setStats(data);
      setRecentReviews(revs.reviews.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return <LoadingSkeleton rows={6} />;
  }

  // Data for Category Bar Chart
  const categoryChartData = (stats.top_issues || []).map((issue) => ({
    name: issue.title.split(' ')[0] + ' ' + (issue.title.split(' ')[1] || ''),
    count: issue.unique_review_count,
    severity: issue.severity
  }));

  // Data for Severity Pie Chart
  const severityColors: Record<string, string> = {
    critical: '#e11d48',
    high: '#ea580c',
    medium: '#d97706',
    low: '#64748b',
    uncertain: '#9333ea'
  };

  const severityCounts: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    uncertain: 0
  };

  (stats.top_issues || []).forEach((iss) => {
    severityCounts[iss.severity] = (severityCounts[iss.severity] || 0) + iss.unique_review_count;
  });

  const severityPieData = Object.entries(severityCounts)
    .filter(([_, val]) => val > 0)
    .map(([key, val]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: val,
      color: severityColors[key] || '#94a3b8'
    }));

  const confirmedDuplicateLabel = `${stats.confirmed_duplicates} confirmed duplicate${stats.confirmed_duplicates === 1 ? '' : 's'}`;
  const suspectedDuplicateLabel = `${stats.suspected_duplicates} suspected candidate${stats.suspected_duplicates === 1 ? '' : 's'}`;

  return (
    <div className="space-y-6">
      {/* Page Title & Context Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Quality Intelligence & Decision Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time feedback triage, root-cause prioritization, and traceable corrective action tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('explorer')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Import Feedback
          </button>
          <button
            onClick={() => onNavigate('actions')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>Action Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Raw</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.total_imported_records}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Imported records</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Unique Reviews</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {stats.valid_unique_reviews}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Reconciled cases</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Duplicates</span>
            <Copy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
            {stats.confirmed_duplicates}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Confirmed; {stats.suspected_duplicates} suspected
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Issue Groups</span>
            <AlertTriangle className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {stats.issues_detected_count}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Taxonomy buckets</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">High / Critical</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600">
            {stats.high_severity_issues_count}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Requires priority</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pending Action</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-700">
            {stats.pending_actions_count}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting review</div>
        </div>
      </div>

      {stats.total_imported_records === 0 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Your workspace is ready for review data</h2>
          <p className="mt-1 text-xs text-slate-600">No customer reviews have been uploaded to this workspace yet. Import a JSON or CSV dataset to generate review, issue, and product insights.</p>
          <button onClick={() => onNavigate('explorer')} className="mt-3 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Import review dataset</button>
        </div>
      )}

      {/* Top 3 Issues Requiring Investigation (Mandatory Hackathon Deliverable) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Top 3 Issues Requiring Immediate Investigation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by transparent composite scoring (Severity weight 50%, Volume 30%, Spread 20% + Low-volume safety override)
            </p>
          </div>
          <button
            onClick={() => onNavigate('issues')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All Issues</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {(stats.top_issues || []).slice(0, 3).map((issue, idx) => (
            <div key={issue.category} className="p-5 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      #{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{issue.title}</h3>
                    <SeverityBadge severity={issue.severity} />
                    <span className="text-xs text-slate-500">
                      Score: <strong className="font-mono text-slate-800">{issue.priority_score}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">
                      Owner: <strong className="text-slate-800">{issue.default_owner_team}</strong>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{issue.description}</p>

                  {/* Evidence Citations (Mandatory check: At least 2 citations per issue) */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-400 block uppercase">
                      Linked Customer Evidence Quotes:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {issue.supporting_citations.slice(0, 2).map((cit) => (
                        <div
                          key={cit.review_id}
                          className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                            <span className="font-mono font-medium text-indigo-600">
                              {cit.review_id} · {cit.product_id}
                            </span>
                            <span>Rating: {cit.rating}★</span>
                          </div>
                          <p className="italic text-slate-700 font-serif">
                            "{cit.quote}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Suggested Action & CTA */}
                <div className="lg:w-72 shrink-0 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Recommended Action
                    </span>
                    <p className="text-xs text-slate-800 font-medium mt-1 leading-relaxed whitespace-normal break-words">
                      {issue.suggested_action}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {issue.affected_products.length} product(s)
                    </span>
                    <button
                      onClick={() => onNavigate('actions')}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                    >
                      Investigate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(stats.top_issues || []).length === 0 && (
            <p className="p-5 text-xs text-slate-500">No issue groups yet. Upload and analyze review data to see evidence-backed issues here.</p>
          )}
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Issue Frequency by Category</h3>
              <p className="text-xs text-slate-500">Unique customer citations per category</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Observed Severity Distribution</h3>
            <p className="text-xs text-slate-500">Prioritization tiers across detected defects</p>
            <div className="h-44 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {severityPieData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}</span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {entry.value} issue(s)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.total_imported_records > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <span className="block font-bold text-slate-800">Workspace duplicate review</span>
              <p className="text-slate-600">
                {confirmedDuplicateLabel}; {suspectedDuplicateLabel}. Confirmed duplicates are excluded from unique-review totals; suspected candidates remain included until resolved.
              </p>
            </div>
          </div>
          {(stats.confirmed_duplicates > 0 || stats.suspected_duplicates > 0) && (
            <button onClick={() => onNavigate('explorer')} className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-200">Review duplicates</button>
          )}
        </div>
      )}

      {/* Recent Reviews Feed */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Latest Customer Feedback Ingestion</h3>
            <p className="text-xs text-slate-500">Live review audit trail with detected issue tags</p>
          </div>
          <button
            onClick={() => onNavigate('explorer')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Open Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-4 font-medium">Review ID</th>
                <th className="py-2.5 px-4 font-medium">Product</th>
                <th className="py-2.5 px-4 font-medium">Rating</th>
                <th className="py-2.5 px-4 font-medium">Review Quote</th>
                <th className="py-2.5 px-4 font-medium">Detected Problems</th>
                <th className="py-2.5 px-4 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentReviews.map((rev) => (
                <tr key={rev.review_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-medium text-indigo-600 whitespace-nowrap">
                    {rev.review_id}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-900 block truncate max-w-[140px]">
                      {rev.product_name || rev.product_id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{rev.product_id}</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums whitespace-nowrap">
                    {rev.rating}★
                  </td>
                  <td className="py-2.5 px-4 max-w-xs truncate text-slate-600">
                    "{rev.review_text}"
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      {rev.issues.map((i: any) => (
                        <span
                          key={i.category}
                          className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700 whitespace-nowrap"
                        >
                          {i.category.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <SeverityBadge severity={rev.issues[0]?.severity || 'medium'} />
                  </td>
                </tr>
              ))}
              {recentReviews.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">No reviews uploaded yet. Import a JSON or CSV dataset to see analyzed customer feedback.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
