import {
  Review,
  IssueSummary,
  CorrectiveAction,
  DecisionVersion,
  AuditLogEntry,
  EvaluationSummary,
  BusinessPlanAssumptions,
  CustomerInterview,
  PilotExperiment,
  ActionCostAssumption,
  AppSettings,
  UserAccount
} from '../types';

export const auth = {
  getUser(): UserAccount | null {
    return null;
  },
  async getMe(): Promise<{ authenticated: boolean; user?: UserAccount }> {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return { authenticated: false };
      return res.json();
    } catch {
      return { authenticated: false };
    }
  },
  async login(payload: { email: string; password: string }): Promise<{ success: boolean; user: UserAccount }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sign in');
    return data;
  },
  async register(payload: { name: string; email: string; store_name: string; password: string }): Promise<{ success: boolean; user: UserAccount }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create account');
    return data;
  },
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // The server session remains authoritative if the network is unavailable.
    }
  },
  async getAuthConfig(): Promise<{ google_configured: boolean; google_client_id: string | null }> {
    const res = await fetch('/api/auth/config');
    return res.json();
  }
};

export interface DashboardStats {
  total_imported_records: number;
  valid_unique_reviews: number;
  confirmed_duplicates: number;
  suspected_duplicates: number;
  issues_detected_count: number;
  high_severity_issues_count: number;
  pending_actions_count: number;
  top_issues: IssueSummary[];
}

export const api = {
  // Stats
  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  // Reviews
  async getReviews(params?: {
    product_id?: string;
    category?: string;
    severity?: string;
    search?: string;
    needs_review?: boolean;
    include_duplicates?: boolean;
  }): Promise<{ reviews: Review[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.product_id) query.set('product_id', params.product_id);
    if (params?.category) query.set('category', params.category);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.search) query.set('search', params.search);
    if (params?.needs_review) query.set('needs_review', 'true');
    if (params?.include_duplicates) query.set('include_duplicates', 'true');

    const res = await fetch(`/api/reviews?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async getReview(id: string): Promise<{ review: Review }> {
    const res = await fetch(`/api/reviews/${id}`);
    if (!res.ok) throw new Error('Failed to fetch review');
    return res.json();
  },

  async updateReviewIssues(
    id: string,
    issues: Review['issues'],
    notes?: string
  ): Promise<{ review: Review }> {
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issues, notes })
    });
    if (!res.ok) throw new Error('Failed to update review issues');
    return res.json();
  },

  async importReviews(payload: {
    filename: string;
    records: any[];
    auto_analyze?: boolean;
  }): Promise<any> {
    const res = await fetch('/api/reviews/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      const details = data.errors?.length
        ? ` ${data.errors.map((error: { row: number; field: string; message: string }) => `Row ${error.row}, ${error.field}: ${error.message}`).join('; ')}`
        : '';
      throw new Error((data.error || 'Failed to import reviews') + details);
    }
    return data;
  },

  async resolveDuplicate(
    reviewId: string,
    markAsDuplicate: boolean
  ): Promise<{ review: Review }> {
    const res = await fetch('/api/reviews/resolve-duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, mark_as_duplicate: markAsDuplicate })
    });
    if (!res.ok) throw new Error('Failed to resolve duplicate');
    return res.json();
  },

  // Analyze
  async runAnalysis(params?: {
    review_ids?: string[];
    force_reanalyze?: boolean;
    method?: 'gemini_ai' | 'deterministic_rules';
  }): Promise<{ success: boolean; analyzed_count: number; reviews: Review[] }> {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {})
    });
    if (!res.ok) throw new Error('Failed to run review analysis');
    return res.json();
  },

  // Issues
  async getIssues(): Promise<{ issues: IssueSummary[]; total: number; top_three: IssueSummary[] }> {
    const res = await fetch('/api/issues');
    if (!res.ok) throw new Error('Failed to fetch issues');
    return res.json();
  },

  // Products
  async getProducts(): Promise<{ products: any[]; total: number }> {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  // Actions
  async getActions(): Promise<{ actions: CorrectiveAction[] }> {
    const res = await fetch('/api/actions');
    if (!res.ok) throw new Error('Failed to fetch actions');
    return res.json();
  },

  async createAction(action: Partial<CorrectiveAction>): Promise<{ action: CorrectiveAction }> {
    const res = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
    if (!res.ok) throw new Error('Failed to create action');
    return res.json();
  },

  async updateAction(
    id: string,
    updates: Partial<CorrectiveAction>
  ): Promise<{ action: CorrectiveAction }> {
    const res = await fetch(`/api/actions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update action');
    return res.json();
  },

  // Decisions
  async getDecisions(): Promise<{ decisions: DecisionVersion[] }> {
    const res = await fetch('/api/decisions');
    if (!res.ok) throw new Error('Failed to fetch decisions');
    return res.json();
  },

  async saveDecision(decision: Partial<DecisionVersion>): Promise<{ decision: DecisionVersion }> {
    const res = await fetch('/api/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision)
    });
    if (!res.ok) throw new Error('Failed to save decision');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<{ logs: AuditLogEntry[] }> {
    const res = await fetch('/api/audit-log');
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Official C01 Dataset Load & Inspection
  async loadOfficialC01(): Promise<{
    success: boolean;
    message: string;
    added: number;
    updated: number;
    total: number;
    unique_valid: number;
    confirmed_duplicates: number;
    job: any;
  }> {
    const res = await fetch('/api/dataset/load-c01', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to load official C01 dataset');
    return res.json();
  },

  async getC01Fixture(): Promise<{ fixture: any }> {
    const res = await fetch('/api/dataset/c01-fixture');
    if (!res.ok) throw new Error('Failed to fetch C01 fixture');
    return res.json();
  },

  // Evaluation
  async getEvaluationBenchmark(
    mode: 'c01_official' | 'granular_taxonomy' = 'c01_official'
  ): Promise<{ evaluation: EvaluationSummary }> {
    const res = await fetch(`/api/evaluation/benchmark?mode=${mode}`);
    if (!res.ok) throw new Error('Failed to fetch evaluation benchmark');
    return res.json();
  },

  // Business Planner
  async getBusinessPlanner(): Promise<{
    assumptions: BusinessPlanAssumptions;
    action_cost_table: ActionCostAssumption[];
  }> {
    const res = await fetch('/api/business-planner');
    if (!res.ok) throw new Error('Failed to fetch business assumptions');
    return res.json();
  },

  async saveBusinessAssumptions(
    assumptions: Partial<BusinessPlanAssumptions>
  ): Promise<{ assumptions: BusinessPlanAssumptions }> {
    const res = await fetch('/api/business-planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assumptions)
    });
    if (!res.ok) throw new Error('Failed to save business assumptions');
    return res.json();
  },

  // Interviews
  async getInterviews(): Promise<{ interviews: CustomerInterview[] }> {
    const res = await fetch('/api/interviews');
    if (!res.ok) throw new Error('Failed to fetch customer interviews');
    return res.json();
  },

  async saveInterview(interview: Partial<CustomerInterview>): Promise<{ interview: CustomerInterview }> {
    const res = await fetch('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interview)
    });
    if (!res.ok) throw new Error('Failed to save interview');
    return res.json();
  },

  // Pilots
  async getPilots(): Promise<{ pilots: PilotExperiment[] }> {
    const res = await fetch('/api/pilots');
    if (!res.ok) throw new Error('Failed to fetch pilot experiments');
    return res.json();
  },

  async savePilot(pilot: Partial<PilotExperiment>): Promise<{ pilot: PilotExperiment }> {
    const res = await fetch('/api/pilots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pilot)
    });
    if (!res.ok) throw new Error('Failed to save pilot');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{ settings: AppSettings }> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<{ settings: AppSettings }> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Reset demo
  async resetDemo(): Promise<any> {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset demo dataset');
    return res.json();
  }
};
