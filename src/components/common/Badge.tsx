import React from 'react';
import { SeverityLevel, ActionStatus, IssueCategory } from '../../types';

export const SeverityBadge: React.FC<{ severity: SeverityLevel }> = ({ severity }) => {
  const styles: Record<SeverityLevel, { bg: string; text: string; label: string }> = {
    critical: {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      text: 'text-rose-700 font-semibold',
      label: 'Critical'
    },
    high: {
      bg: 'bg-orange-50 border-orange-200 text-orange-700',
      text: 'text-orange-700 font-semibold',
      label: 'High'
    },
    medium: {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      text: 'text-amber-700 font-medium',
      label: 'Medium'
    },
    low: {
      bg: 'bg-slate-100 border-slate-200 text-slate-700',
      text: 'text-slate-700 font-normal',
      label: 'Low'
    },
    uncertain: {
      bg: 'bg-purple-50 border-purple-200 text-purple-700',
      text: 'text-purple-700 font-medium',
      label: 'Uncertain'
    }
  };

  const current = styles[severity] || styles.medium;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${current.bg}`}
    >
      {current.label}
    </span>
  );
};

export const ActionStatusBadge: React.FC<{ status: ActionStatus }> = ({ status }) => {
  const map: Record<ActionStatus, { bg: string; text: string }> = {
    Proposed: { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'Proposed' },
    'Under Review': { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Under Review' },
    Approved: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Approved' },
    'In Progress': { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'In Progress' },
    Blocked: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Blocked' },
    Completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Completed' },
    Rejected: { bg: 'bg-slate-100 text-slate-500 border-slate-200', text: 'Rejected' }
  };

  const s = map[status] || map.Proposed;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border font-medium ${s.bg}`}>
      {s.text}
    </span>
  );
};

export const CategoryTag: React.FC<{ category: IssueCategory }> = ({ category }) => {
  const format = (cat: string) =>
    cat
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
      {format(category)}
    </span>
  );
};

export const MethodBadge: React.FC<{ method?: string }> = ({ method }) => {
  if (method === 'gemini_ai' || method === 'gemini_ai_enriched') {
    return (
      <span className="inline-flex items-center text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
        {method === 'gemini_ai_enriched' ? 'Gemini + Rule Engine' : 'Gemini 3.8 Flash'}
      </span>
    );
  }
  if (method === 'manual_override') {
    return (
      <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
        Human Override
      </span>
    );
  }
  if (method === 'deterministic_rules') {
    return (
      <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
        Rule Engine
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
      Pending
    </span>
  );
};
