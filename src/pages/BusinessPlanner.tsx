import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { BusinessPlanAssumptions, ActionCostAssumption } from '../types';
import { LoadingSkeleton } from '../components/common/EmptyState';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  ShieldCheck,
  CheckCircle2,
  Save,
  RotateCcw
} from 'lucide-react';

export const BusinessPlanner: React.FC = () => {
  const [assumptions, setAssumptions] = useState<BusinessPlanAssumptions | null>(null);
  const [actionCostTable, setActionCostTable] = useState<ActionCostAssumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadPlanner();
  }, []);

  const loadPlanner = async () => {
    try {
      setLoading(true);
      const res = await api.getBusinessPlanner();
      setAssumptions(res.assumptions);
      setActionCostTable(res.action_cost_table);
    } catch (err) {
      console.error('Failed to load business planner:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!assumptions) return;
    try {
      setSaving(true);
      await api.saveBusinessAssumptions(assumptions);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert('Failed to save business assumptions');
    } finally {
      setSaving(false);
    }
  };

  const applyScenario = (type: 'conservative' | 'base' | 'optimistic') => {
    if (!assumptions) return;
    if (type === 'conservative') {
      setAssumptions({
        ...assumptions,
        scenario: 'conservative',
        monthly_subscription_usd: 99,
        subscribing_stores: 12,
        estimated_monthly_churn_pct: 7.0,
        customer_acquisition_cost_usd: 280
      });
    } else if (type === 'base') {
      setAssumptions({
        ...assumptions,
        scenario: 'base',
        monthly_subscription_usd: 149,
        subscribing_stores: 24,
        estimated_monthly_churn_pct: 4.5,
        customer_acquisition_cost_usd: 220
      });
    } else if (type === 'optimistic') {
      setAssumptions({
        ...assumptions,
        scenario: 'optimistic',
        monthly_subscription_usd: 249,
        subscribing_stores: 48,
        estimated_monthly_churn_pct: 2.8,
        customer_acquisition_cost_usd: 175
      });
    }
  };

  if (loading || !assumptions) {
    return <LoadingSkeleton rows={8} />;
  }

  // Live Unit Economics Math
  const stores = assumptions.subscribing_stores;
  const price = assumptions.monthly_subscription_usd;
  const mrr = stores * price;
  const annualRunRate = mrr * 12;

  // Monthly variable AI inference cost
  const apiCostPerStore = (assumptions.average_reviews_per_store_monthly / 1000) * assumptions.gemini_api_cost_per_1k_reviews;
  const totalApiCosts = apiCostPerStore * stores;

  // Total variable support + hosting + opex
  const totalSupportCosts = assumptions.support_cost_per_store_usd * stores;
  const totalHostingCosts = assumptions.monthly_hosting_usd;
  const totalOpex = assumptions.other_opex_monthly_usd;

  const totalMonthlyCost = totalApiCosts + totalSupportCosts + totalHostingCosts + totalOpex;
  const costToServePerStore = stores > 0 ? totalMonthlyCost / stores : 0;
  const grossProfit = mrr - totalMonthlyCost;
  const grossMarginPct = mrr > 0 ? (grossProfit / mrr) * 100 : 0;

  // Break-even store count: Fixed costs / (Price - Variable cost per store)
  const fixedMonthlyCosts = totalHostingCosts + totalOpex;
  const contributionMarginPerStore = price - (apiCostPerStore + assumptions.support_cost_per_store_usd);
  const breakEvenStores = contributionMarginPerStore > 0 ? Math.ceil(fixedMonthlyCosts / contributionMarginPerStore) : 0;

  // CAC Payback Period (months)
  const monthlyProfitPerStore = contributionMarginPerStore;
  const cacPaybackMonths = monthlyProfitPerStore > 0 ? (assumptions.customer_acquisition_cost_usd / monthlyProfitPerStore) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Small D2C Merchant Business Planner
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            MBA assignment deliverables: Subscription pricing, cost-to-serve, unit economics, and first-customer path.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              Assumptions Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Model'}</span>
          </button>
        </div>
      </div>

      {/* Scenario Selectors */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">Planning Scenario:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            {(['conservative', 'base', 'optimistic'] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => applyScenario(sc)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                  assumptions.scenario === sc
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Hypothetical values clearly separated from verified live revenue.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Monthly Revenue (MRR)
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ${mrr.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            ${annualRunRate.toLocaleString()} ARR
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Monthly OPEX
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-700 mt-1">
            ${Math.round(totalMonthlyCost).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Hosting + AI + Support</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Cost-to-Serve
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600 mt-1">
            ${costToServePerStore.toFixed(1)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Per store monthly</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Gross Margin
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
            {grossMarginPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            ${Math.round(grossProfit).toLocaleString()} gross profit
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Break-Even Count
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {breakEvenStores}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Subscribed stores</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            CAC Payback
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-indigo-700 mt-1">
            {cacPaybackMonths.toFixed(1)} mo
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Payback period</div>
        </div>
      </div>

      {/* Model Input Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Revenue & Customer Parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Monthly Subscription Price per Store:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${assumptions.monthly_subscription_usd} / month
                </span>
              </div>
              <input
                type="range"
                min="49"
                max="399"
                step="10"
                value={assumptions.monthly_subscription_usd}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, monthly_subscription_usd: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Subscribed Stores Count:</span>
                <span className="font-mono font-bold text-slate-900">
                  {assumptions.subscribing_stores} stores
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={assumptions.subscribing_stores}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, subscribing_stores: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Customer Acquisition Cost (CAC):</span>
                <span className="font-mono font-bold text-slate-900">
                  ${assumptions.customer_acquisition_cost_usd}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="600"
                step="25"
                value={assumptions.customer_acquisition_cost_usd}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, customer_acquisition_cost_usd: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Estimated Monthly Churn Rate:</span>
                <span className="font-mono font-bold text-slate-900">
                  {assumptions.estimated_monthly_churn_pct}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={assumptions.estimated_monthly_churn_pct}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, estimated_monthly_churn_pct: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Cost-to-Serve & Operating Cost Assumptions
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Gemini API Cost (per 1,000 reviews):</span>
                <span className="font-mono font-bold text-slate-900">
                  ${assumptions.gemini_api_cost_per_1k_reviews.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="2.00"
                step="0.05"
                value={assumptions.gemini_api_cost_per_1k_reviews}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, gemini_api_cost_per_1k_reviews: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Monthly Cloud Hosting Cost:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${assumptions.monthly_hosting_usd} / month
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="300"
                step="15"
                value={assumptions.monthly_hosting_usd}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, monthly_hosting_usd: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Support & Success Cost per Store:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${assumptions.support_cost_per_store_usd} / month
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={assumptions.support_cost_per_store_usd}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, support_cost_per_store_usd: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Other General & Administrative Monthly OPEX:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${assumptions.other_opex_monthly_usd} / month
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={assumptions.other_opex_monthly_usd}
                onChange={(e) =>
                  setAssumptions({ ...assumptions, other_opex_monthly_usd: Number(e.target.value) })
                }
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Organiser Action-Cost Assumption Table (Mandatory from Problem Statement C01) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Action-Cost Assumption Table (Case C01 Starter)
          </h3>
          <p className="text-xs text-slate-500">
            Benchmark cost estimates and return reduction percentages per corrective action category
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-4 font-medium">Action Code</th>
                <th className="py-2.5 px-4 font-medium">Intervention Type</th>
                <th className="py-2.5 px-4 font-medium">Department</th>
                <th className="py-2.5 px-4 font-medium">Est. Implementation Cost</th>
                <th className="py-2.5 px-4 font-medium">Turnaround</th>
                <th className="py-2.5 px-4 font-medium">Expected Return Reduction</th>
                <th className="py-2.5 px-4 font-medium">Scope Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {actionCostTable.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                    {item.id}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {item.action_type}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                    {item.department}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-900 font-medium whitespace-nowrap">
                    ${item.estimated_cost_usd}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums whitespace-nowrap">
                    {item.implementation_time_days} days
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-emerald-700 whitespace-nowrap">
                    -{item.expected_return_reduction_pct}%
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 max-w-sm">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Customer Profile & First-Customer Path (MBA Strategic Deliverables) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900">
            Target Customer Profile (Ideal Customer Profile)
          </h4>
          <div className="space-y-2 text-slate-600">
            <p>
              <strong>Brand Scale:</strong> Direct-to-Consumer e-commerce brands doing $2M to $25M annual GMV (approx. 500 – 4,000 monthly orders).
            </p>
            <p>
              <strong>Primary Persona:</strong> Merchant Quality Lead, CX Director, or Founder-Operator spending 6–10 hours/week manually parsing spreadsheets.
            </p>
            <p>
              <strong>Willingness-to-Pay Trigger:</strong> Preventing just 6 high-value return claims per month ($28 avg return handling + reverse shipping = $168) instantly offsets the $149/mo subscription.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900">
            First-Customer Acquisition Path (0 to 10 Stores)
          </h4>
          <div className="space-y-2 text-slate-600">
            <p>
              <strong>Phase 1 (Weeks 1-2):</strong> Shadow weekly quality review sessions with 3 design partners (footwear, apparel, kitchenware) at zero software fee.
            </p>
            <p>
              <strong>Phase 2 (Weeks 3-4):</strong> Deliver actionable supplier evidence reports and prove 60% reduction in weekly triage hours.
            </p>
            <p>
              <strong>Phase 3 (Month 2):</strong> Convert pilot stores into annual commercial contracts at $149/month with guaranteed ROI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
