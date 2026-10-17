import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DecisionVersion, TeamDepartment } from '../types';
import { Modal } from '../components/common/Modal';
import { LoadingSkeleton, EmptyState } from '../components/common/EmptyState';
import {
  History,
  GitCompare,
  ArrowRight,
  PlusCircle,
  FileText,
  UserCheck,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const DecisionHistory: React.FC = () => {
  const [decisions, setDecisions] = useState<DecisionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<DecisionVersion | null>(null);

  // New Negotiation Form Modal
  const [isNewDecisionOpen, setIsNewDecisionOpen] = useState(false);
  const [issueCategory, setIssueCategory] = useState('manufacturing_defects');
  const [issueTitle, setIssueTitle] = useState('Apparel Stitching & Seam Failures');
  const [originalProducts, setOriginalProducts] = useState('PROD-JACKET-12, PROD-PANTS-11, PROD-KNIT-07, PROD-UNKNOWN');
  const [originalRec, setOriginalRec] = useState('Issue blanket halt on all apparel factory shipments.');
  const [finalProducts, setFinalProducts] = useState('PROD-JACKET-12, PROD-PANTS-11');
  const [finalAction, setFinalAction] = useState('Targeted zipper pull-test on Alpine Jacket and pocket seam gauge inspection on Commuter Chino only.');
  const [finalTeam, setFinalTeam] = useState<TeamDepartment>('Supplier Management');
  const [reason, setReason] = useState('Blanket halt would jeopardize Q4 campaign sales; isolating the 2 confirmed models addresses 80% of returns without shutting down unproblematic knitwear lines.');
  const [negotiator, setNegotiator] = useState('Elena Rostova (Quality Lead) & VP Operations');

  useEffect(() => {
    loadDecisions();
  }, []);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      const res = await api.getDecisions();
      setDecisions(res.decisions);
      if (res.decisions.length > 0 && !selectedDecision) {
        setSelectedDecision(res.decisions[0]);
      }
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNegotiation = async () => {
    try {
      const origProds = originalProducts.split(',').map((p) => p.trim());
      const finProds = finalProducts.split(',').map((p) => p.trim());

      await api.saveDecision({
        decision_id: `DEC-${Date.now().toString().slice(-4)}`,
        issue_category: issueCategory as any,
        issue_title: issueTitle,
        created_by: negotiator,
        original_ranking: 1,
        original_scope_product_ids: origProds,
        original_recommendation: originalRec,
        original_team: 'Manufacturing & Production',
        original_priority: 'P1 - High',
        final_scope_product_ids: finProds,
        final_corrective_action: finalAction,
        final_team: finalTeam,
        final_priority: 'P1 - High',
        scope_change_reason: reason,
        evidence_reviewed_count: 3,
        negotiation_notes: 'Stakeholder negotiation between Merchant QA and Supplier Operations.',
        status: 'Agreed'
      });

      setIsNewDecisionOpen(false);
      loadDecisions();
    } catch (err) {
      alert('Failed to save negotiated decision');
    }
  };

  // Compute product diff
  const getProductDiff = (original: string[], final: string[]) => {
    const origSet = new Set(original);
    const finalSet = new Set(final);

    const kept = final.filter((p) => origSet.has(p));
    const removed = original.filter((p) => !finalSet.has(p));
    const added = final.filter((p) => !origSet.has(p));

    return { kept, removed, added };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Original vs Final Decision History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mandatory audit tracking preserving initial AI recommendations against human-negotiated investigation scope.
          </p>
        </div>
        <button
          onClick={() => setIsNewDecisionOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Record Negotiated Scope</span>
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : decisions.length === 0 ? (
        <EmptyState
          icon={GitCompare}
          title="No decision records found"
          description="Record a scope negotiation to preserve starting AI recommendations alongside agreed merchant decisions."
          actionLabel="Record First Decision"
          onAction={() => setIsNewDecisionOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Decision List Column */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Negotiated Investigations ({decisions.length})
            </h2>

            <div className="space-y-2">
              {decisions.map((dec) => {
                const isSelected = selectedDecision?.decision_id === dec.decision_id;
                return (
                  <div
                    key={dec.decision_id}
                    onClick={() => setSelectedDecision(dec)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        {dec.decision_id}
                      </span>
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        v{dec.version} {dec.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{dec.issue_title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {dec.scope_change_reason}
                    </p>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>By: {dec.created_by.split(' ')[0]}</span>
                      <span>{new Date(dec.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side-by-Side Comparison Panel */}
          {selectedDecision && (
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600">
                        {selectedDecision.decision_id}
                      </span>
                      <span className="text-slate-300">·</span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {selectedDecision.issue_title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Agreed between Quality Lead & Operations Lead on {new Date(selectedDecision.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold">
                    Scope Negotiated
                  </span>
                </div>

                {/* Side-by-Side Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Original AI Recommendation */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Starting State (AI Recommendation)
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold uppercase">
                        Recommended Action:
                      </span>
                      <p className="text-xs font-medium text-slate-800 mt-0.5">
                        {selectedDecision.original_recommendation}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold uppercase">
                        Initial Scope ({selectedDecision.original_scope_product_ids.length} SKUs):
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDecision.original_scope_product_ids.map((pid) => (
                          <span
                            key={pid}
                            className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 font-mono text-[11px] rounded"
                          >
                            {pid}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                      <span>Owner Team: <strong>{selectedDecision.original_team}</strong></span>
                    </div>
                  </div>

                  {/* Right Column: Final Negotiated Decision */}
                  <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-700">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Final Negotiated Decision (Merchant QA)
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-indigo-500 block font-semibold uppercase">
                        Agreed Corrective Action:
                      </span>
                      <p className="text-xs font-semibold text-indigo-950 mt-0.5">
                        {selectedDecision.final_corrective_action}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-indigo-500 block font-semibold uppercase">
                        Agreed Scope ({selectedDecision.final_scope_product_ids.length} SKUs):
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDecision.final_scope_product_ids.map((pid) => (
                          <span
                            key={pid}
                            className="px-2 py-0.5 bg-indigo-100/70 border border-indigo-300 text-indigo-900 font-mono font-semibold text-[11px] rounded"
                          >
                            {pid}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-indigo-200 text-xs text-indigo-900">
                      <span>Owner Team: <strong>{selectedDecision.final_team}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Scope Differential Breakdown */}
                {(() => {
                  const diff = getProductDiff(
                    selectedDecision.original_scope_product_ids,
                    selectedDecision.final_scope_product_ids
                  );
                  return (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                        Scope Change Differential:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 block text-[11px]">
                            Retained in Investigation:
                          </span>
                          <span className="font-mono text-emerald-700 font-medium">
                            {diff.kept.join(', ') || 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">
                            Removed from Investigation:
                          </span>
                          <span className="font-mono text-rose-700 font-medium">
                            {diff.removed.join(', ') || 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Justification & Negotiation Notes */}
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-2 text-xs text-amber-900">
                  <span className="font-bold uppercase tracking-wider text-[11px] block">
                    Merchant Justification for Scope Modification:
                  </span>
                  <p className="leading-relaxed font-serif italic text-amber-950">
                    "{selectedDecision.scope_change_reason}"
                  </p>
                  <p className="text-[11px] text-amber-800 pt-1">
                    Context: {selectedDecision.negotiation_notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Negotiated Decision Modal */}
      {isNewDecisionOpen && (
        <Modal
          isOpen={isNewDecisionOpen}
          onClose={() => setIsNewDecisionOpen(false)}
          title="Record Scope Negotiation"
          subtitle="Document differences between AI recommendation and final merchant decision"
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Investigation Title:
              </label>
              <input
                type="text"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block">
                  Original AI Recommendation
                </span>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Initial Action:
                  </label>
                  <textarea
                    value={originalRec}
                    onChange={(e) => setOriginalRec(e.target.value)}
                    rows={2}
                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Original Product SKUs:
                  </label>
                  <input
                    type="text"
                    value={originalProducts}
                    onChange={(e) => setOriginalProducts(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-200">
                <span className="text-xs font-bold text-indigo-900 block">
                  Final Negotiated Scope
                </span>
                <div>
                  <label className="text-[11px] font-semibold text-indigo-800 block mb-1">
                    Agreed Action:
                  </label>
                  <textarea
                    value={finalAction}
                    onChange={(e) => setFinalAction(e.target.value)}
                    rows={2}
                    className="w-full p-2 text-xs bg-white border border-indigo-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-indigo-800 block mb-1">
                    Agreed Product SKUs:
                  </label>
                  <input
                    type="text"
                    value={finalProducts}
                    onChange={(e) => setFinalProducts(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-indigo-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Reason for Scope Modification (Business Rationale):
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why scope was narrowed or expanded (e.g. balancing sales risk vs defect remediation)..."
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Responsible Team:
                </label>
                <select
                  value={finalTeam}
                  onChange={(e) => setFinalTeam(e.target.value as TeamDepartment)}
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
                  Decided By:
                </label>
                <input
                  type="text"
                  value={negotiator}
                  onChange={(e) => setNegotiator(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewDecisionOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNegotiation}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Preserve Negotiated Decision
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
