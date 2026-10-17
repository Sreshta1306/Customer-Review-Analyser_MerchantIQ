import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { parseImportText } from '../import/parsing';
import { Review, IssueCategory, SeverityLevel } from '../types';
import { SeverityBadge, MethodBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState, LoadingSkeleton } from '../components/common/EmptyState';
import {
  UploadCloud,
  Search,
  Filter,
  CheckCircle,
  Copy,
  AlertCircle,
  Edit2,
  Download,
  FileCheck,
  ShieldCheck,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const ReviewExplorer: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [filterDuplicatesOnly, setFilterDuplicatesOnly] = useState(false);

  // Edit / Override Modal
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importStatus, setImportStatus] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [selectedCategory, selectedSeverity, filterDuplicatesOnly]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.getReviews({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        include_duplicates: true
      });
      setReviews(res.reviews);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDuplicate = async (reviewId: string, markAsDuplicate: boolean) => {
    try {
      await api.resolveDuplicate(reviewId, markAsDuplicate);
      fetchReviews();
    } catch (err) {
      alert('Error updating duplicate status');
    }
  };

  const handleOpenEdit = (review: Review) => {
    setEditingReview(review);
    setEditNotes(review.user_notes || '');
    setEditCategories(review.issues.map((i) => i.category));
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;
    try {
      const newIssues = editCategories.map((cat) => ({
        category: cat as IssueCategory,
        evidence: editingReview.issues.find((i) => i.category === cat)?.evidence || editingReview.review_text.slice(0, 80),
        confidence: 1.0,
        severity: (editingReview.issues[0]?.severity || 'medium') as SeverityLevel,
        rationale: 'Manual override by merchant analyst'
      }));

      await api.updateReviewIssues(editingReview.review_id, newIssues, editNotes);
      setEditingReview(null);
      fetchReviews();
    } catch (err) {
      alert('Failed to save label override');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportText(String(event.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importText) return;
    try {
      setIsImporting(true);
      setImportStatus(null);
      const parsed = parseImportText(importText);
      if (parsed.rejectedRows.length > 0 && parsed.records.length === 0) {
        throw new Error(parsed.rejectedRows.map((row) => `Row ${row.row}: ${row.message}`).join('; '));
      }

      const res = await api.importReviews({
        filename: importFileName || 'uploaded_reviews.json',
        records: parsed.records,
        auto_analyze: true
      });
      if (parsed.rejectedRows.length > 0) {
        res.parse_warnings = parsed.rejectedRows;
      }
      setImportStatus(res);
      fetchReviews();
    } catch (err: any) {
      setImportStatus({ error: err.message || 'Invalid format' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sample = `review_id,product_id,product_name,rating,review_text,created_at
R101,PROD-SHOE-01,Aeroflex Marathon Running Shoe,1,"The stitching along the heel ripped during first run.",2026-10-16T10:00:00Z
R102,PROD-BLEND-08,NutriBlend High-Torque Blender,1,"Motor burned out after two uses and smelled like burnt rubber.",2026-10-16T11:30:00Z
R103,PROD-UNKNOWN,Unknown Item,2,"Fabric was totally see through and sizing ran small.",2026-10-16T14:15:00Z`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_reviews_template.csv';
    a.click();
  };

  const allCategories: IssueCategory[] = [
    'product_damage',
    'manufacturing_defects',
    'poor_product_quality',
    'incorrect_sizing',
    'incorrect_item_delivered',
    'missing_component',
    'packaging_problems',
    'functional_failures',
    'delivery_related_issues',
    'other',
    'customer_support',
    'uncertain'
  ];

  // Client search filter
  const filteredReviews = reviews.filter((r) => {
    if (filterDuplicatesOnly && !r.is_duplicate_candidate && !r.duplicate_of) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.review_id.toLowerCase().includes(q) ||
      r.product_id.toLowerCase().includes(q) ||
      (r.product_name && r.product_name.toLowerCase().includes(q)) ||
      r.review_text.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Review Explorer & Ingestion Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit customer reviews, inspect multi-label classifications, handle duplicate candidates, and override tags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Reviews</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by review text, review ID, product SKU..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="uncertain">Uncertain</option>
            </select>

            <button
              onClick={() => setFilterDuplicatesOnly(!filterDuplicatesOnly)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                filterDuplicatesOnly
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicates Only</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong className="font-mono text-slate-900">{filteredReviews.length}</strong> reviews
          </span>
          <span className="text-[11px] text-slate-400">
            Multi-issue reviews count once per group, once overall.
          </span>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <LoadingSkeleton rows={8} />
        ) : filteredReviews.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching reviews found"
            description="Try clearing your search query or filters to inspect all ingested reviews."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedSeverity('all');
              setFilterDuplicatesOnly(false);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4 font-medium">Review ID</th>
                  <th className="py-3 px-4 font-medium">Product SKU</th>
                  <th className="py-3 px-4 font-medium">Rating</th>
                  <th className="py-3 px-4 font-medium min-w-[280px]">Review Text & Citations</th>
                  <th className="py-3 px-4 font-medium">Detected Problems</th>
                  <th className="py-3 px-4 font-medium">Severity</th>
                  <th className="py-3 px-4 font-medium">Method</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredReviews.map((rev) => (
                  <tr
                    key={rev.review_id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      rev.is_duplicate_candidate ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-semibold text-indigo-600">
                        {rev.review_id}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 truncate max-w-[150px]">
                        {rev.product_name || rev.product_id}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {rev.product_id}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        {rev.rating}★
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-slate-800 line-clamp-2">
                        "{rev.review_text}"
                      </p>

                      {/* Display exact citations */}
                      <div className="mt-1 space-y-0.5">
                        {rev.issues.map((iss, i) => (
                          <div key={i} className="text-[11px] text-indigo-700 font-serif italic">
                            ↳ evidence: "{iss.evidence}"
                          </div>
                        ))}
                      </div>

                      {/* Duplicate Candidate Banner */}
                      {rev.is_duplicate_candidate && (
                        <div className="mt-1.5 flex items-center gap-2 p-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                          <Copy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            {rev.duplicate_of
                              ? `Duplicate of ${rev.duplicate_of}`
                              : 'Suspected duplicate text'}
                          </span>
                          <button
                            onClick={() =>
                              handleResolveDuplicate(rev.review_id, !rev.duplicate_of)
                            }
                            className="ml-auto underline font-semibold text-amber-900"
                          >
                            {rev.duplicate_of ? 'Mark Distinct' : 'Confirm Duplicate'}
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {rev.issues.map((i, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-700 whitespace-nowrap inline-block"
                          >
                            {i.category.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <SeverityBadge severity={rev.issues[0]?.severity || 'medium'} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <MethodBadge method={rev.analysis_method} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleOpenEdit(rev)}
                        title="Override classification or add analyst notes"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">Override</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Classification Override Modal */}
      {editingReview && (
        <Modal
          isOpen={Boolean(editingReview)}
          onClose={() => setEditingReview(null)}
          title={`Override Classification for ${editingReview.review_id}`}
          subtitle={`Product: ${editingReview.product_id} (${editingReview.product_name || 'Item'})`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Raw Customer Review:
              </span>
              <p className="text-slate-800 italic font-serif">"{editingReview.review_text}"</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-2">
                Assigned Issue Categories (Multi-select allowed):
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {allCategories.map((cat) => {
                  const checked = editCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditCategories([...editCategories, cat]);
                          } else {
                            setEditCategories(editCategories.filter((c) => c !== cat));
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span>{cat.replace(/_/g, ' ')}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Analyst Investigation Notes:
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Document rationale for overriding the AI classification..."
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Save Override & Log Audit
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ingestion & Import Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Import Feedback Dataset (CSV or JSON)"
          subtitle="Map incoming columns to review_id, product_id, review_text, rating, created_at"
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
              <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:underline">
                <span>Upload a CSV or JSON file</span>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">
                {importFileName ? `Selected: ${importFileName}` : 'Accepts CSV or JSON array'}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Or Paste JSON / CSV Content Directly:
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="[ { review_id: 'R101', product_id: 'PROD-01', review_text: '...', rating: 1 } ]"
                rows={5}
                className="w-full font-mono text-[11px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Import Status Alert */}
            {importStatus && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  importStatus.error
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {importStatus.error ? (
                  <div>Error: {importStatus.error}</div>
                ) : (
                  <div>
                    Imported <strong>{importStatus.job?.valid_rows}</strong> valid reviews! (Added: {importStatus.added}, Reconciled: {importStatus.updated}).
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Get Sample File</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting || !importText}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isImporting ? 'Validating & Importing...' : 'Validate & Import'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
