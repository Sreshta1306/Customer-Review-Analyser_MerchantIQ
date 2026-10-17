import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CustomerInterview } from '../types';
import { Modal } from '../components/common/Modal';
import { LoadingSkeleton, EmptyState } from '../components/common/EmptyState';
import {
  Users2,
  PlusCircle,
  Edit2,
  Calendar,
  Clock,
  HelpCircle,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';

export const CustomerDiscovery: React.FC = () => {
  const [interviews, setInterviews] = useState<CustomerInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingInterview, setEditingInterview] = useState<CustomerInterview | null>(null);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);

  // Form State
  const [role, setRole] = useState('');
  const [org, setOrg] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<CustomerInterview['contact_status']>('Planned');
  const [workflow, setWorkflow] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [tools, setTools] = useState('');
  const [hours, setHours] = useState(8);
  const [feedback, setFeedback] = useState('');
  const [willingness, setWillingness] = useState<CustomerInterview['willingness_to_pilot']>('Open with conditions');
  const [followUp, setFollowUp] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const res = await api.getInterviews();
      setInterviews(res.interviews);
    } catch (err) {
      console.error('Failed to load customer interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (int: CustomerInterview) => {
    setEditingInterview(int);
    setRole(int.participant_role);
    setOrg(int.organization_type);
    setDate(int.contact_date);
    setStatus(int.contact_status);
    setWorkflow(int.existing_workflow);
    setPainPoints(int.biggest_pain_points);
    setTools(int.current_tools);
    setHours(int.estimated_hours_weekly);
    setFeedback(int.feedback_on_copilot);
    setWillingness(int.willingness_to_pilot);
    setFollowUp(int.follow_up_action);
    setNotes(int.notes);
  };

  const handleSaveInterview = async () => {
    if (!editingInterview) return;
    try {
      await api.saveInterview({
        interview_id: editingInterview.interview_id,
        participant_role: role,
        organization_type: org,
        contact_date: date,
        contact_status: status,
        existing_workflow: workflow,
        biggest_pain_points: painPoints,
        current_tools: tools,
        estimated_hours_weekly: Number(hours),
        feedback_on_copilot: feedback,
        willingness_to_pilot: willingness,
        follow_up_action: followUp,
        notes: notes,
        is_verified_interview: false
      });
      setEditingInterview(null);
      loadInterviews();
    } catch (err) {
      alert('Failed to save interview record');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Customer Discovery & Quality Lead Interviews
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validation tracker for the required three merchant interviews (footwear, appliances, boutique apparel).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuestionnaireOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Interview Questionnaire</span>
          </button>
        </div>
      </div>

      {/* Transparency Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        <div className="text-slate-600">
          <strong className="text-slate-900 font-semibold">Hackathon Academic Integrity Rule: </strong>
          Interview records below represent planned research designs and outreach protocols. No fabricated interview responses or fake live customer quotes are claimed.
        </div>
      </div>

      {/* Interviews Grid */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {interviews.map((item) => (
            <div
              key={item.interview_id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    {item.interview_id}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold border ${
                      item.contact_status === 'Scheduled'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : item.contact_status === 'Contacted'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {item.contact_status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.participant_role}</h3>
                  <p className="text-xs text-slate-500">{item.organization_type}</p>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-100 pt-2 text-slate-600">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Current Workflow & Tools:
                    </span>
                    <p className="mt-0.5 text-slate-800">{item.existing_workflow}</p>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Tools: {item.current_tools} ({item.estimated_hours_weekly} hrs/wk)
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Biggest Pain Point:
                    </span>
                    <p className="mt-0.5 text-rose-700 font-medium">{item.biggest_pain_points}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Willingness to Pilot:
                    </span>
                    <span className="font-semibold text-slate-900">{item.willingness_to_pilot}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Target: {item.contact_date}
                </span>
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Update Log</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Interview Modal */}
      {editingInterview && (
        <Modal
          isOpen={Boolean(editingInterview)}
          onClose={() => setEditingInterview(null)}
          title={`Update Discovery Log: ${editingInterview.interview_id}`}
          subtitle={editingInterview.participant_role}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Participant Role:
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Organization & Scale:
                </label>
                <input
                  type="text"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Status:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="Planned">Planned</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Follow-up required">Follow-up required</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Date:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Hours/Wk:</label>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Existing Review Workflow:
              </label>
              <textarea
                value={workflow}
                onChange={(e) => setWorkflow(e.target.value)}
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Biggest Pain Points:
              </label>
              <textarea
                value={painPoints}
                onChange={(e) => setPainPoints(e.target.value)}
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Follow-up Action & Outcome:
              </label>
              <input
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingInterview(null)}
                className="px-3.5 py-1.5 font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInterview}
                className="px-4 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save Record
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Discovery Questionnaire Guide Modal */}
      {isQuestionnaireOpen && (
        <Modal
          isOpen={isQuestionnaireOpen}
          onClose={() => setIsQuestionnaireOpen(false)}
          title="Merchant Quality Lead Interview Protocol"
          subtitle="Semi-structured interview questions for customer discovery"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
              <h4 className="font-bold text-indigo-900">1. Workflow & Baseline Time Allocation</h4>
              <p>• "Walk me through what happens every Monday when new customer reviews and return reasons arrive."</p>
              <p>• "How many hours does your team spend tagging reviews into spreadsheets?"</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900">2. Root Cause & Supplier Friction</h4>
              <p>• "When you notice a stitching or zipper failure, how do you present the evidence to your factory partner?"</p>
              <p>• "Have you ever had a supplier dispute a defect claim due to lack of direct quotes or batch context?"</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900">3. Willingness to Pay & Pilot Criteria</h4>
              <p>• "If an automated copilot reduced your triage time from 8 hours to 2 hours and generated traceable evidence reports, what would a reasonable monthly subscription look like for your brand?"</p>
              <p>• "What specific threshold would count as a successful 30-day trial for your team?"</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsQuestionnaireOpen(false)}
                className="px-4 py-1.5 font-semibold text-white bg-slate-900 rounded-lg"
              >
                Close Protocol
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
