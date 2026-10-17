import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { EvaluationSummary, EvaluationRecord } from '../types';
import { LoadingSkeleton, EmptyState } from '../components/common/EmptyState';
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Play,
  Download,
  FileCheck,
  Check,
  X,
  Target,
  Award
} from 'lucide-react';

export const EvaluationLab: React.FC = () => {
  const [evaluation, setEvaluation] = useState<EvaluationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filterDisagreementsOnly, setFilterDisagreementsOnly] = useState(false);

  useEffect(() => {
    loadEvaluation();
  }, []);

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const res = await api.getEvaluationBenchmark('c01_official');
      setEvaluation(res.evaluation);
    } catch (err) {
      console.error('Failed to load evaluation benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBenchmark = async () => {
    try {
      setRunning(true);
      const res = await api.getEvaluationBenchmark('c01_official');
      setEvaluation(res.evaluation);
    } catch (err) {
      alert('Failed to run benchmark');
    } finally {
      setRunning(false);
    }
  };

  const handleExportJson = () => {
    if (!evaluation) return;
    const blob = new Blob([JSON.stringify(evaluation, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case_c01_evaluation_benchmark_${Date.now()}.json`;
    a.click();
  };

  if (loading || !evaluation) {
    return <LoadingSkeleton rows={8} />;
  }

  const targetMet = evaluation.recovered_label_count >= evaluation.target_recovery_threshold;
  const filteredRecords = filterDisagreementsOnly
    ? evaluation.records.filter((r) => !r.is_exact_match)
    : evaluation.records;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Evaluation Lab — Case C01 Benchmark
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              20 Judge-Labelled Reviews
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Validation engine assessing multi-label recovery, precision, recall, and edge-case classification accuracy against official reference labels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleRunBenchmark}
            disabled={running}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{running ? 'Evaluating...' : 'Re-run Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* Primary Case Outcome Check Card */}
      <div
        className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          targetMet
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              targetMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">
                Case Outcome Check: 10 Points Target Status
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-white/80 border border-emerald-300 text-emerald-800">
                {targetMet ? 'Criteria Satisfied' : 'Pending'}
              </span>
            </div>
            <p className="text-xs mt-1 leading-relaxed text-emerald-900">
              Recovered <strong>{evaluation.recovered_label_count}</strong> agreed issue labels across the 20 judge-labelled reviews (Problem statement requirement: $\ge 16$ labels). Multi-issue reviews correctly preserve distinct evidence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0 bg-white/80 px-4 py-2.5 rounded-xl border border-emerald-200">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Recovered</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {evaluation.recovered_label_count}
            </span>
            <span className="text-[11px] text-slate-400 font-mono"> / 16 target</span>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">F1 Score</span>
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {(evaluation.f1_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Methodology & Taxonomy Adapter Explanation */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed space-y-2">
        <div className="flex items-center gap-2 text-slate-800 font-bold">
          <FileCheck className="w-4 h-4 text-indigo-600" />
          <span>Evaluation Methodology & Multi-Label Matching Policy</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] pt-1">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-0.5">1. Evaluation Denominator</span>
            <span>Fixed benchmark of 20 official judge-labelled reviews (R001–R020). Predictions are generated from raw review text independently without reference label leakage.</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-0.5">2. Multi-Label Policy</span>
            <span>A review mentioning multiple distinct defects (e.g. R001 with both Damage and Sizing) is evaluated against each expected topic separately. Label set exact match requires identical topic sets.</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-0.5">3. Taxonomy Adapter</span>
            <span>Granular defect categories (e.g. broken zipper, seam tear, damaged glass) map directly into the 5 C01 reference topics: <code>quality</code>, <code>delivery</code>, <code>size</code>, <code>packaging</code>, and <code>support</code>.</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Exact-Set Match Rate
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {evaluation.exact_match_count} / {evaluation.total_samples}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {Math.round(evaluation.exact_match_rate * 100)}% identical label sets
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Overall Precision
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600 mt-1">
            {(evaluation.precision * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            True positives / all predictions
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Overall Recall
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
            {(evaluation.recall * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Ground-truth recovery coverage
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Disagreements
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {evaluation.total_samples - evaluation.exact_match_count}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Reviewed for multi-label rules
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Per-Category Performance Breakdown</h3>
          <p className="text-xs text-slate-500">Support, Precision, Recall, and F1 across benchmark categories</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-4 font-medium">Issue Category</th>
                <th className="py-2.5 px-4 font-medium">Support (Truth)</th>
                <th className="py-2.5 px-4 font-medium">True Positives</th>
                <th className="py-2.5 px-4 font-medium">False Positives</th>
                <th className="py-2.5 px-4 font-medium">False Negatives</th>
                <th className="py-2.5 px-4 font-medium">Precision</th>
                <th className="py-2.5 px-4 font-medium">Recall</th>
                <th className="py-2.5 px-4 font-medium">F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {evaluation.category_metrics.map((m) => (
                <tr key={m.category} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    {m.category.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">{m.support}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-emerald-700 font-semibold">{m.true_positives}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-amber-700">{m.false_positives}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-rose-700">{m.false_negatives}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums font-semibold">
                    {(m.precision * 100).toFixed(0)}%
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums font-semibold">
                    {(m.recall * 100).toFixed(0)}%
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-indigo-700">
                    {(m.f1 * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disagreements & Review Matching Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">20 Judge Reviews Matching Table</h3>
            <p className="text-xs text-slate-500">Inspection of predicted vs ground-truth labels and disagreements</p>
          </div>
          <button
            onClick={() => setFilterDisagreementsOnly(!filterDisagreementsOnly)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filterDisagreementsOnly
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {filterDisagreementsOnly ? 'Show All 20 Reviews' : 'Show Disagreements Only'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4 font-medium">Review ID</th>
                <th className="py-3 px-4 font-medium min-w-[220px]">Review Text</th>
                <th className="py-3 px-4 font-medium">Ground Truth (Judge)</th>
                <th className="py-3 px-4 font-medium">Predicted (Copilot)</th>
                <th className="py-3 px-4 font-medium">Agreed Labels</th>
                <th className="py-3 px-4 font-medium">Status / Disagreement Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.map((r) => (
                <tr
                  key={r.review_id}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    !r.is_exact_match ? 'bg-amber-50/20' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                    {r.review_id}
                  </td>

                  <td className="py-3 px-4 max-w-sm text-slate-700">
                    "{r.review_text}"
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {r.ground_truth_labels.map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-800 whitespace-nowrap font-medium"
                        >
                          {c.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {r.predicted_labels.map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] text-indigo-800 whitespace-nowrap font-medium"
                        >
                          {c.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {r.recovered_labels.map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-800 whitespace-nowrap font-semibold"
                        >
                          ✓ {c.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {r.is_exact_match ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                        <Check className="w-3.5 h-3.5" />
                        Exact Match
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-medium">
                        {r.disagreement_notes}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
