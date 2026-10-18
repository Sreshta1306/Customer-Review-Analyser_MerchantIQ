import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { SeverityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSkeleton, EmptyState } from '../components/common/EmptyState';
import {
  PackageCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Star,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const ProductQuality: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productReviews, setProductReviews] = useState<any[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts();
      setProducts(res.products);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProduct = async (prod: any) => {
    setSelectedProduct(prod);
    try {
      const res = await api.getReviews({ product_id: prod.product_id, include_duplicates: true });
      setProductReviews(res.reviews);
    } catch {
      setProductReviews([]);
    }
  };

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.product_id.toLowerCase().includes(q) || p.product_name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Product Quality Portfolio
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify affected product SKUs, track defect recurrence, and link open investigations.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or product name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Product Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Tracked Products & SKUs</h2>
          <span className="text-xs text-slate-500">
            {filtered.length} products monitored
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title={products.length === 0 ? 'No product data yet' : 'No matching products found'}
            description={products.length === 0
              ? 'Upload a JSON or CSV review dataset in Review Explorer. Products will be derived from the uploaded reviews.'
              : 'Clear your search term to see all products derived from this workspace review data.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4 font-medium">Product / SKU</th>
                  <th className="py-3 px-4 font-medium">Unique Reviews</th>
                  <th className="py-3 px-4 font-medium">Average Rating</th>
                  <th className="py-3 px-4 font-medium">Observed Problems</th>
                  <th className="py-3 px-4 font-medium">Highest Severity</th>
                  <th className="py-3 px-4 font-medium">Open Actions</th>
                  <th className="py-3 px-4 font-medium">Latest Complaint</th>
                  <th className="py-3 px-4 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((prod) => (
                  <tr
                    key={prod.product_id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => handleOpenProduct(prod)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{prod.product_name}</span>
                        {prod.product_id === 'PROD-UNKNOWN' && (
                          <span className="px-1.5 py-0.2 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 rounded font-normal">
                            Unknown Product
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {prod.product_id}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {prod.total_unique_reviews}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">unique</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          {prod.average_rating}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-1 flex-wrap">
                        {prod.issue_categories.map((c: string) => (
                          <span
                            key={c}
                            className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600 whitespace-nowrap"
                          >
                            {c.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <SeverityBadge severity={prod.highest_severity} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {prod.open_actions_count > 0 ? (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold text-[11px]">
                          {prod.open_actions_count} Open Action
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(prod.latest_review_date).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProduct(prod);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1"
                      >
                        <span>Drilldown</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct.product_name}
          subtitle={`SKU: ${selectedProduct.product_id} · ${selectedProduct.total_unique_reviews} Unique Reviews Ingested`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Rating</span>
                <span className="font-mono font-bold text-slate-900 mt-1 block">
                  {selectedProduct.average_rating} / 5.0
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Max Severity</span>
                <div className="mt-1"><SeverityBadge severity={selectedProduct.highest_severity} /></div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Open Actions</span>
                <span className="font-mono font-bold text-indigo-700 mt-1 block">
                  {selectedProduct.open_actions_count} active
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Linked Customer Feedback History ({productReviews.length}):
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {productReviews.filter((review) => !review.duplicate_of).map((r) => (
                  <div
                    key={r.review_id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono font-semibold text-indigo-600">
                        {r.review_id}
                      </span>
                      <span>{r.rating}★ · {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-800 italic font-serif">"{r.review_text}"</p>
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {r.issues.map((i: any) => (
                        <span
                          key={i.category}
                          className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600"
                        >
                          {i.category.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
