import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AppSettings, AuditLogEntry } from '../types';
import { LoadingSkeleton } from '../components/common/EmptyState';
import {
  Settings as SettingsIcon,
  Save,
  Sliders,
  Cpu,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [s, l] = await Promise.all([api.getSettings(), api.getAuditLogs()]);
      setSettings(s.settings);
      setAuditLogs(l.logs);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await api.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      const l = await api.getAuditLogs();
      setAuditLogs(l.logs);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <LoadingSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Settings & Prioritization Engine Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure scoring weights, AI classification fallbacks, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              Settings Saved!
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scoring Weights */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Prioritization Formula Weights
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Customize the relative weights between defect severity, review volume, and catalog spread. (Weights should sum to 1.0).
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Severity Weight:</span>
                <span className="font-mono font-bold text-slate-900">
                  {Math.round(settings.prioritization_weights.severity_weight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={settings.prioritization_weights.severity_weight}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    prioritization_weights: {
                      ...settings.prioritization_weights,
                      severity_weight: parseFloat(e.target.value)
                    }
                  })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Unique Review Volume Weight:</span>
                <span className="font-mono font-bold text-slate-900">
                  {Math.round(settings.prioritization_weights.volume_weight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.6"
                step="0.05"
                value={settings.prioritization_weights.volume_weight}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    prioritization_weights: {
                      ...settings.prioritization_weights,
                      volume_weight: parseFloat(e.target.value)
                    }
                  })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Affected Product Spread Weight:</span>
                <span className="font-mono font-bold text-slate-900">
                  {Math.round(settings.prioritization_weights.spread_weight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.05"
                value={settings.prioritization_weights.spread_weight}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    prioritization_weights: {
                      ...settings.prioritization_weights,
                      spread_weight: parseFloat(e.target.value)
                    }
                  })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 leading-relaxed text-[11px]">
              <strong>Low-Volume Safety Override:</strong> Regardless of weight configuration, defects with confirmed <em>Critical</em> severity (fire/electrical hazards) automatically retain a minimum baseline score of 88 to guarantee human escalation.
            </div>
          </div>
        </div>

        {/* Intelligence Engine & Workspace */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Intelligence Engine & Ingestion Rules
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Classification Engine Mode:
              </label>
              <select
                value={settings.classification_mode}
                onChange={(e) =>
                  setSettings({ ...settings, classification_mode: e.target.value as any })
                }
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="gemini_with_fallback">
                  Gemini 3.8 Flash (Server-Side) with Rule Fallback (Recommended)
                </option>
                <option value="deterministic_only">
                  Deterministic Rule-Based Engine Only (Offline / Zero-API)
                </option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Workspace / Merchant Organization Name:
              </label>
              <input
                type="text"
                value={settings.workspace_name}
                onChange={(e) => setSettings({ ...settings, workspace_name: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-700 mb-1">
                <span>Text Similarity Duplicate Threshold:</span>
                <span className="font-mono font-bold text-slate-900">
                  {Math.round(settings.duplicate_similarity_threshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.99"
                step="0.05"
                value={settings.duplicate_similarity_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    duplicate_similarity_threshold: parseFloat(e.target.value)
                  })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-[11px]">
              <strong>Prompt-Injection Defense Enabled:</strong> Ingested review text is strictly treated as untrusted user data. Model schemas enforce typed JSON responses and ignore adversarial jailbreak attempts.
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Trail */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">System Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {auditLogs.length} events logged
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                <th className="py-2.5 px-4 font-medium">Timestamp</th>
                <th className="py-2.5 px-4 font-medium">Event Type</th>
                <th className="py-2.5 px-4 font-medium">Actor</th>
                <th className="py-2.5 px-4 font-medium">Entity ID</th>
                <th className="py-2.5 px-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {auditLogs.map((log) => (
                <tr key={log.log_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString()} · {new Date(log.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap font-mono text-[11px] font-semibold text-indigo-700">
                    {log.event_type}
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap text-slate-800">
                    {log.user}
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                    {log.entity_id}
                  </td>
                  <td className="py-2 px-4 text-slate-600 max-w-sm truncate">
                    {log.details}
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
