import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { PilotExperiment } from '../types';
import { LoadingSkeleton, EmptyState } from '../components/common/EmptyState';
import {
  GitBranch,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Edit2
} from 'lucide-react';

export const PilotExperiments: React.FC = () => {
  const [pilots, setPilots] = useState<PilotExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPilot, setSelectedPilot] = useState<PilotExperiment | null>(null);

  useEffect(() => {
    loadPilots();
  }, []);

  const loadPilots = async () => {
    try {
      setLoading(true);
      const res = await api.getPilots();
      setPilots(res.pilots);
      if (res.pilots.length > 0) {
        setSelectedPilot(res.pilots[0]);
      }
    } catch (err) {
      console.error('Failed to load pilots:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !selectedPilot) {
    return <LoadingSkeleton rows={6} />;
  }

  const timeSavingsPct = selectedPilot.trial_processing_hours_weekly
    ? Math.round(
        ((selectedPilot.baseline_processing_hours_weekly - selectedPilot.trial_processing_hours_weekly) /
          selectedPilot.baseline_processing_hours_weekly) *
          100
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Pilot Experiments & 30-Day Merchant Trial
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured roadmap measuring analyst review triage hours and supplier action acceptance against baseline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
            Week {selectedPilot.current_week} of 4 Active
          </span>
        </div>
      </div>

      {/* Pilot Hypothesis Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-mono text-indigo-600 font-bold block">
              {selectedPilot.pilot_id}
            </span>
            <h2 className="text-sm font-bold text-slate-900">{selectedPilot.title}</h2>
          </div>
          <div className="text-xs text-slate-500">
            Partner: <strong>{selectedPilot.target_partner}</strong>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
            Testable Hypothesis:
          </span>
          <p className="text-slate-800 font-medium leading-relaxed font-serif italic">
            "{selectedPilot.hypothesis}"
          </p>
        </div>

        {/* Metric Comparison Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Baseline Triage Time</span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {selectedPilot.baseline_processing_hours_weekly} hrs/wk
            </div>
            <span className="text-[10px] text-slate-400">Manual tagging</span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 block">Trial Copilot Time</span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
              {selectedPilot.trial_processing_hours_weekly} hrs/wk
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">
              -{timeSavingsPct}% time reduction
            </span>
          </div>

          <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-200">
            <span className="text-[11px] font-semibold text-indigo-800 block">Action Acceptance</span>
            <div className="text-xl font-bold font-mono tabular-nums text-indigo-700 mt-0.5">
              {selectedPilot.action_acceptance_rate_pct}%
            </div>
            <span className="text-[10px] text-indigo-500 font-medium">Agreed by team</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Decision Turnaround</span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {selectedPilot.decision_turnaround_days} days
            </div>
            <span className="text-[10px] text-slate-400">From 5.5 day baseline</span>
          </div>
        </div>
      </div>

      {/* Suggested 30-Day Plan (4-Week Milestones) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Suggested 30-Day Quality Review Trial Plan
          </h3>
          <p className="text-xs text-slate-500">
            Weekly milestones establishing baseline, shadowing workflow, tuning taxonomy, and validating commercial ROI
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {selectedPilot.weekly_milestones.map((m) => (
            <div key={m.week} className="p-4 hover:bg-slate-50/60 transition-colors flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  m.status === 'Done'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : m.status === 'In Progress'
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 ring-2 ring-indigo-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                W{m.week}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    Week {m.week}: {m.title}
                  </h4>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold border ${
                      m.status === 'Done'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : m.status === 'In Progress'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{m.goal}</p>

                {m.notes && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                    <strong>Observations:</strong> {m.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Limitation Disclosure (Mandatory Hackathon Deliverable) */}
      <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="font-bold uppercase tracking-wider text-[11px]">
            Statistically Rigorous Domain Precaution:
          </span>
        </div>
        <p className="leading-relaxed text-amber-800">
          <strong>Review frequency is not product defect prevalence.</strong> Customer reviews suffer from extreme voluntary response bias (unhappy customers are up to 10× more likely to leave a review than satisfied buyers). Review-to-Action provides qualitative triage and hypothesis generation; calculating an absolute defect rate requires total sales denominators from merchant ERP systems.
        </p>
      </div>
    </div>
  );
};
