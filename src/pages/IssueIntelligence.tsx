import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { IssueSummary, IssueCategory, SeverityLevel } from '../types';
import { SeverityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSkeleton, EmptyState } from '../components/common/EmptyState';
import { PageId } from '../components/layout/Sidebar';
import {
  AlertOctagon,
  ArrowUpDown,
  Search,
  CheckCircle2,
  ListChecks,
  PlusCircle,
  ExternalLink,
  Flame,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface IssueIntelligenceProps {
  onNavigate: (page: PageId) => void;
}

export const IssueIntelligence: React.FC<IssueIntelligenceProps> = ({ onNavigate }) => {
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'priority' | 'count' | 'severity' | 'products'>('priority');
  const [selectedIssue, setSelectedIssue] = useState<IssueSummary | null>(null);

  // New action hypothesis modal
  const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
  const [actionHypothesis, setActionHypothesis] = useState('');
  const [actionTeam, setActionTeam] = useState('Quality Assurance');
  const [actionPriority, setActionPriority] = useState<'P0 - Critical' | 'P1 - High' | 'P2 - Medium' | 'P3 - Low'>('P1 - High');

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const res = await api.getIssues();
      setIssues(res.issues);
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenActionModal = (issue: IssueSummary) => {
    setSelectedIssue(issue);
    setActionHypothesis(issue.suggested_action);
    setActionTeam(issue.default_owner_team);
    setActionPriority(issue.severity === 'critical' ? 'P0 - Critical' : 'P1 - High');
    setIsCreateActionOpen(true);
  };

  const handleSaveAction = async () => {
    if (!selectedIssue) return;
    try {
      await api.createAction({
        issue_category: selectedIssue.category,
        issue_title: selectedIssue.title,
        affected_products: selectedIssue.affected_products,
        recommended_action: actionHypothesis,
        rationale: `Formulated hypothesis from ${selectedIssue.unique_review_count} customer reviews and linked citations.`,
        assigned_team: actionTeam as any,
        owner_name: 'Merchant Quality Lead',
        priority: actionPriority,
        severity: selectedIssue.severity,
        estimated_cost_usd: 450,
        expected_benefit: 'Validate root cause and reduce return rate.',
        status: 'Proposed',
        supporting_review_ids: selectedIssue.supporting_citations.map((c) => c.review_id)
      });
      setIsCreateActionOpen(false);
      onNavigate('actions');
    } catch (err) {
      alert('Failed to create action');
    }
  };

  const severityOrder: Record<SeverityLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    uncertain: 0
  };

  const sortedIssues = [...issues].sort((a, b) => {
    if (sortBy === 'priority') return b.priority_score - a.priority_score;
    if (sortBy === 'count') return b.unique_review_count - a.unique_review_count;
    if (sortBy === 'severity') return severityOrder[b.severity] - severityOrder[a.severity];
    if (sortBy === 'products') return b.affected_products.length - a.affected_products.length;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Issue Intelligence & Root-Cause Hypotheses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent composite scoring separating observed customer evidence from inferred defect causes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 p-1 rounded-lg">
            <span className="px-2 font-medium">Sort by:</span>
            <button
              onClick={() => setSortBy('priority')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                sortBy === 'priority' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Priority Score
            </button>
            <button
              onClick={() => setSortBy('severity')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                sortBy === 'severity' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Severity
            </button>
            <button
              onClick={() => setSortBy('count')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                sortBy === 'count' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Unique Volume
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Top 3 Issue Groups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Top 3 High-Priority Issues Requiring Investigation
          </h2>
          <span className="text-[11px] text-slate-400">
            Escalates critical safety defects regardless of low volume
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedIssues.slice(0, 3).map((issue, idx) => (
            <div
              key={issue.category}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-indigo-300 transition-colors cursor-pointer"
              onClick={() => setSelectedIssue(issue)}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 font-mono">
                    RANK #{idx + 1}
                  </span>
                  <SeverityBadge severity={issue.severity} />
                </div>

                <h3 className="text-sm font-bold text-slate-900">{issue.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{issue.description}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Priority Score: <strong className="font-mono text-slate-900">{issue.priority_score}</strong>
                  </span>
                  <span>
                    Reviews: <strong className="font-mono text-slate-900">{issue.unique_review_count}</strong>
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {issue.affected_products.length} product SKU(s)
                </span>
                <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <span>Inspect Citations</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Issues Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Complete Defect Taxonomy & Priority Breakdown
          </h3>
          <span className="text-xs text-slate-500">
            {issues.length} detected categories
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4 font-medium">Issue Group</th>
                  <th className="py-3 px-4 font-medium">Severity</th>
                  <th className="py-3 px-4 font-medium">Priority Score</th>
                  <th className="py-3 px-4 font-medium">Unique Reviews</th>
                  <th className="py-3 px-4 font-medium">Affected SKUs</th>
                  <th className="py-3 px-4 font-medium">Suggested Action</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedIssues.map((issue) => (
                  <tr
                    key={issue.category}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{issue.title}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {issue.description}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <SeverityBadge severity={issue.severity} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {issue.priority_score}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">/100</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {issue.unique_review_count}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">cases</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono tabular-nums text-slate-700">
                        {issue.affected_products.length}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">products</span>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <div className="min-w-[260px] max-w-[420px] whitespace-normal break-words leading-relaxed text-slate-600">
                        {issue.suggested_action}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => setSelectedIssue(issue)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        Evidence
                      </button>
                      <button
                        onClick={() => handleOpenActionModal(issue)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                      >
                        Propose Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Detail & Citations Drawer / Modal */}
      {selectedIssue && !isCreateActionOpen && (
        <Modal
          isOpen={Boolean(selectedIssue)}
          onClose={() => setSelectedIssue(null)}
          title={selectedIssue.title}
          subtitle={`Priority Score: ${selectedIssue.priority_score} · ${selectedIssue.unique_review_count} Unique Customer Cases`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Severity</span>
                <div className="mt-1"><SeverityBadge severity={selectedIssue.severity} /></div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Assigned Dept</span>
                <span className="font-semibold text-slate-900 mt-1 block">{selectedIssue.default_owner_team}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Affected SKUs</span>
                <span className="font-mono font-semibold text-slate-900 mt-1 block">
                  {selectedIssue.affected_products.join(', ')}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">AI Confidence</span>
                <span className="font-mono font-semibold text-emerald-700 mt-1 block">
                  {Math.round(selectedIssue.average_confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Citations Excerpts (Mandatory check: At least 2 citations) */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Customer Citations & Verified Text Evidence:
              </h4>
              <div className="space-y-2">
                {selectedIssue.supporting_citations.map((cit) => (
                  <div
                    key={cit.review_id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono font-semibold text-indigo-600">
                        {cit.review_id} · Product {cit.product_id}
                      </span>
                      <span>Rating: {cit.rating}★ · {new Date(cit.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="italic text-slate-800 font-serif">
                      "{cit.quote}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Investigation Checklist */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2 text-xs">
              <span className="font-bold text-indigo-900 block">
                Investigation Checklist & Root-Cause Protocol:
              </span>
              <ul className="space-y-1.5 text-indigo-800 list-disc list-inside">
                <li>Verify batch manufacturing date and supplier facility code.</li>
                <li>Conduct sample pull-test / drop-test against quality benchmark.</li>
                <li>Inspect return shipping condition vs warehouse dispatch records.</li>
                <li>Review size specification tolerances against physical production blocks.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleOpenActionModal(selectedIssue)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Formulate Corrective Action</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Propose Action Modal */}
      {isCreateActionOpen && selectedIssue && (
        <Modal
          isOpen={isCreateActionOpen}
          onClose={() => setIsCreateActionOpen(false)}
          title={`Propose Action for ${selectedIssue.title}`}
          subtitle="Formulate testable corrective hypothesis and assign department ownership"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Recommended Corrective Action (Testable Hypothesis):
              </label>
              <textarea
                value={actionHypothesis}
                onChange={(e) => setActionHypothesis(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Assigned Team:
                </label>
                <select
                  value={actionTeam}
                  onChange={(e) => setActionTeam(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="Supplier Management">Supplier Management</option>
                  <option value="Packaging & Unboxing">Packaging & Unboxing</option>
                  <option value="Quality Assurance">Quality Assurance</option>
                  <option value="Manufacturing & Production">Manufacturing & Production</option>
                  <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Customer Support">Customer Support</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Priority:
                </label>
                <select
                  value={actionPriority}
                  onChange={(e) => setActionPriority(e.target.value as any)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="P0 - Critical">P0 - Critical</option>
                  <option value="P1 - High">P1 - High</option>
                  <option value="P2 - Medium">P2 - Medium</option>
                  <option value="P3 - Low">P3 - Low</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              Note: Recommendations are hypotheses requiring testing and investigation, not proven facts. Scope adjustments will be tracked in Decision History.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateActionOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAction}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Save Action & Assign
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
