import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CorrectiveAction, ActionStatus, TeamDepartment, SeverityLevel } from '../types';
import { ActionStatusBadge, SeverityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSkeleton, EmptyState } from '../components/common/EmptyState';
import { PageId } from '../components/layout/Sidebar';
import {
  CheckSquare,
  PlusCircle,
  Edit2,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  TrendingDown,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface ActionCenterProps {
  onNavigate: (page: PageId) => void;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({ onNavigate }) => {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);

  // Status Change / Edit Form
  const [editingAction, setEditingAction] = useState<CorrectiveAction | null>(null);
  const [formStatus, setFormStatus] = useState<ActionStatus>('Proposed');
  const [formOwner, setFormOwner] = useState('');
  const [formTeam, setFormTeam] = useState<TeamDepartment>('Quality Assurance');
  const [formNotes, setFormNotes] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  // New Action Modal
  const [isNewActionOpen, setIsNewActionOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('manufacturing_defects');
  const [newActionText, setNewActionText] = useState('');
  const [newTeam, setNewTeam] = useState<TeamDepartment>('Supplier Management');
  const [newOwner, setNewOwner] = useState('');
  const [newPriority, setNewPriority] = useState<'P0 - Critical' | 'P1 - High' | 'P2 - Medium' | 'P3 - Low'>('P1 - High');
  const [newCost, setNewCost] = useState(450);
  const [newProducts, setNewProducts] = useState('PROD-JACKET-12');

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      setLoading(true);
      const res = await api.getActions();
      setActions(res.actions);
    } catch (err) {
      console.error('Failed to load actions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (action: CorrectiveAction) => {
    setEditingAction(action);
    setFormStatus(action.status);
    setFormOwner(action.owner_name);
    setFormTeam(action.assigned_team);
    setFormNotes(action.reviewer_notes || '');
    setFormDueDate(action.due_date);
  };

  const handleSaveEdit = async () => {
    if (!editingAction) return;
    try {
      await api.updateAction(editingAction.action_id, {
        status: formStatus,
        owner_name: formOwner,
        assigned_team: formTeam,
        reviewer_notes: formNotes,
        due_date: formDueDate
      });
      setEditingAction(null);
      loadActions();
    } catch (err) {
      alert('Failed to update action');
    }
  };

  const handleCreateNewAction = async () => {
    if (!newTitle || !newActionText) return;
    try {
      await api.createAction({
        issue_category: newCategory as any,
        issue_title: newTitle,
        affected_products: newProducts.split(',').map((p) => p.trim()),
        recommended_action: newActionText,
        rationale: 'Hypothesis formed during quality review.',
        assigned_team: newTeam,
        owner_name: newOwner || 'Unassigned',
        priority: newPriority,
        severity: newPriority.startsWith('P0') ? 'critical' : 'high',
        estimated_cost_usd: Number(newCost) || 450,
        expected_benefit: 'Reduce customer defect returns.',
        status: 'Proposed',
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      });
      setIsNewActionOpen(false);
      loadActions();
    } catch (err) {
      alert('Failed to create action');
    }
  };

  const filtered = actions.filter((a) => {
    if (filterStatus === 'all') return true;
    return a.status === filterStatus;
  });

  const statuses: ActionStatus[] = [
    'Proposed',
    'Under Review',
    'Approved',
    'In Progress',
    'Blocked',
    'Completed',
    'Rejected'
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Corrective Action Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Testable quality hypotheses assigned to cross-functional departments with cost-benefit tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('decisions')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <span>Decision History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsNewActionOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Action</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto text-xs">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Actions ({actions.length})
        </button>
        {statuses.map((st) => {
          const count = actions.filter((a) => a.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Actions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No actions in this view"
            description="Propose a corrective action from Issue Intelligence or create a new action plan."
            actionLabel="Create First Action"
            onAction={() => setIsNewActionOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4 font-medium">Action ID</th>
                  <th className="py-3 px-4 font-medium">Issue Group</th>
                  <th className="py-3 px-4 font-medium min-w-[240px]">Recommended Action Hypothesis</th>
                  <th className="py-3 px-4 font-medium">Assigned Team & Owner</th>
                  <th className="py-3 px-4 font-medium">Priority</th>
                  <th className="py-3 px-4 font-medium">Est. Cost</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Due Date</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((act) => (
                  <tr key={act.action_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-indigo-600">
                      {act.action_id}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{act.issue_title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {act.affected_products.join(', ')}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {act.recommended_action}
                      </p>
                      {act.reviewer_notes && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          Notes: {act.reviewer_notes}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{act.assigned_team}</div>
                      <div className="text-[11px] text-slate-400">{act.owner_name}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{act.priority}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-slate-800">
                      {act.cost_currency === 'INR' || act.estimated_cost_inr ? (
                        <span className="text-emerald-700 font-semibold">₹{act.estimated_cost_inr || act.estimated_cost_usd}</span>
                      ) : (
                        <span>${act.estimated_cost_usd}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <ActionStatusBadge status={act.status} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {act.due_date}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(act)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Action / Update Status Modal */}
      {editingAction && (
        <Modal
          isOpen={Boolean(editingAction)}
          onClose={() => setEditingAction(null)}
          title={`Update Action: ${editingAction.action_id}`}
          subtitle={editingAction.issue_title}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Hypothesis Under Investigation:
              </span>
              <p className="font-medium text-slate-800">{editingAction.recommended_action}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Investigation Status:
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ActionStatus)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Assigned Team:
                </label>
                <select
                  value={formTeam}
                  onChange={(e) => setFormTeam(e.target.value as TeamDepartment)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="Quality Assurance">Quality Assurance</option>
                  <option value="Supplier Management">Supplier Management</option>
                  <option value="Packaging & Unboxing">Packaging & Unboxing</option>
                  <option value="Manufacturing & Production">Manufacturing & Production</option>
                  <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Customer Support">Customer Support</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Assignee Name:
                </label>
                <input
                  type="text"
                  value={formOwner}
                  onChange={(e) => setFormOwner(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Due Date:
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Reviewer Rationale & Audit Notes:
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Log reason for status update, sample test results, or supplier meeting agreements..."
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAction(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Save Updates & Log Audit
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create New Action Modal */}
      {isNewActionOpen && (
        <Modal
          isOpen={isNewActionOpen}
          onClose={() => setIsNewActionOpen(false)}
          title="Create Corrective Action Hypothesis"
          subtitle="Formulate an investigation hypothesis and assign an owner department"
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Quick C01 Preset Pickers */}
            <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
              <span className="text-[11px] font-semibold text-indigo-900 block mb-1.5">
                Official Case C01 Cost Assumption Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewTitle('Inspect Zipper Sample Batch (C01)');
                    setNewCategory('manufacturing_defects');
                    setNewActionText('inspect zipper sample');
                    setNewTeam('Supplier Management');
                    setNewPriority('P1 - High');
                    setNewCost(1000);
                    setNewProducts('PROD-JACKET-12');
                  }}
                  className="px-2.5 py-1 text-xs bg-white text-indigo-700 border border-indigo-200 rounded-md font-medium hover:bg-indigo-50 transition-colors shadow-2xs"
                >
                  inspect zipper sample (₹1,000)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTitle('Review Sizing Guide Calibration (C01)');
                    setNewCategory('incorrect_sizing');
                    setNewActionText('review size guide');
                    setNewTeam('Product Management');
                    setNewPriority('P2 - Medium');
                    setNewCost(500);
                    setNewProducts('PROD-SHOE-01, PROD-SHIRT-05');
                  }}
                  className="px-2.5 py-1 text-xs bg-white text-indigo-700 border border-indigo-200 rounded-md font-medium hover:bg-indigo-50 transition-colors shadow-2xs"
                >
                  review size guide (₹500)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Action Title / Defect Summary:
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Sole Delamination & Adhesive Stress Audit"
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Recommended Action (Hypothesis):
              </label>
              <textarea
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                placeholder="What action should be tested first? (e.g. Conduct pull-test on heel seam lot #44...)"
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Responsible Department:
                </label>
                <select
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value as TeamDepartment)}
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
                  Priority Level:
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="P0 - Critical">P0 - Critical</option>
                  <option value="P1 - High">P1 - High</option>
                  <option value="P2 - Medium">P2 - Medium</option>
                  <option value="P3 - Low">P3 - Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Estimated Investigation Cost ($):
                </label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Affected Product SKUs:
                </label>
                <input
                  type="text"
                  value={newProducts}
                  onChange={(e) => setNewProducts(e.target.value)}
                  placeholder="PROD-SHOE-01, PROD-BOOT-09"
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewActionOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewAction}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Propose Action
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
