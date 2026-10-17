export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'uncertain';

export type IssueCategory =
  | 'product_damage'
  | 'manufacturing_defects'
  | 'poor_product_quality'
  | 'incorrect_sizing'
  | 'incorrect_item_delivered'
  | 'missing_component'
  | 'packaging_problems'
  | 'functional_failures'
  | 'delivery_related_issues'
  | 'other'
  | 'uncertain';

export interface IssueLabel {
  category: IssueCategory;
  evidence: string;
  confidence: number;
  severity: SeverityLevel;
  rationale?: string;
}

export interface Review {
  review_id: string;
  product_id: string;
  product_name?: string;
  review_text: string;
  rating: number;
  created_at: string;
  evaluation_expected_topics?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  issues: IssueLabel[];
  analysis_method?: 'gemini_ai' | 'deterministic_rules' | 'manual_override' | 'unprocessed';
  analyzed_at?: string;
  needs_human_review?: boolean;
  duplicate_of?: string; // ID of original review if confirmed duplicate
  is_duplicate_candidate?: boolean;
  duplicate_similarity?: number;
  duplicate_reason?: string;
  user_notes?: string;
  is_flagged?: boolean;
}

export interface IssueSummary {
  category: IssueCategory;
  title: string;
  description: string;
  unique_review_count: number;
  review_ids: string[];
  affected_products: string[];
  severity: SeverityLevel;
  average_confidence: number;
  uncertain_count: number;
  priority_score: number;
  supporting_citations: {
    review_id: string;
    product_id: string;
    quote: string;
    rating: number;
    created_at: string;
  }[];
  suggested_action: string;
  default_owner_team: TeamDepartment;
  investigation_status: 'unassigned' | 'under_investigation' | 'action_proposed' | 'resolved';
}

export type TeamDepartment =
  | 'Quality Assurance'
  | 'Manufacturing & Production'
  | 'Supplier Management'
  | 'Packaging & Unboxing'
  | 'Logistics & Warehousing'
  | 'Product Management'
  | 'Customer Support';

export type ActionStatus =
  | 'Proposed'
  | 'Under Review'
  | 'Approved'
  | 'In Progress'
  | 'Blocked'
  | 'Completed'
  | 'Rejected';

export interface CorrectiveAction {
  action_id: string;
  issue_category: IssueCategory;
  issue_title: string;
  affected_products: string[];
  recommended_action: string;
  rationale: string;
  assigned_team: TeamDepartment;
  owner_name: string;
  priority: 'P0 - Critical' | 'P1 - High' | 'P2 - Medium' | 'P3 - Low';
  severity: SeverityLevel;
  estimated_cost_usd: number;
  estimated_cost_inr?: number;
  cost_currency?: 'INR' | 'USD';
  expected_benefit: string;
  status: ActionStatus;
  due_date: string;
  created_at: string;
  updated_at: string;
  reviewer_notes: string;
  supporting_review_ids: string[];
  verification_checkpoint?: string;
  is_negotiated?: boolean;
}

export interface DecisionVersion {
  decision_id: string;
  issue_category: IssueCategory;
  issue_title: string;
  timestamp: string;
  created_by: string;
  
  // Starting AI Recommendation state
  original_ranking: number;
  original_scope_product_ids: string[];
  original_recommendation: string;
  original_team: TeamDepartment;
  original_priority: string;
  
  // Final Negotiated Decision state
  final_scope_product_ids: string[];
  final_corrective_action: string;
  final_team: TeamDepartment;
  final_priority: string;
  scope_change_reason: string;
  evidence_reviewed_count: number;
  negotiation_notes: string;
  status: 'Draft' | 'Agreed' | 'Implemented';
  version: number;
}

export interface AuditLogEntry {
  log_id: string;
  event_type:
    | 'IMPORT_COMPLETED'
    | 'ANALYSIS_RUN'
    | 'LABEL_CORRECTION'
    | 'SEVERITY_OVERRIDE'
    | 'ACTION_CREATED'
    | 'ACTION_STATUS_CHANGED'
    | 'ACTION_ASSIGNED'
    | 'SCOPE_NEGOTIATED'
    | 'DUPLICATE_RESOLVED'
    | 'BENCHMARK_EVALUATED'
    | 'SETTINGS_UPDATED';
  entity_id: string;
  entity_type: 'review' | 'action' | 'decision' | 'dataset' | 'evaluation';
  timestamp: string;
  user: string;
  previous_value?: string;
  new_value?: string;
  details: string;
}

export type C01ReferenceTopic = 'quality' | 'delivery' | 'size' | 'packaging' | 'support';

export interface EvaluationRecord {
  review_id: string;
  review_text: string;
  product_id: string;
  ground_truth_labels: string[];
  predicted_labels: string[];
  is_exact_match: boolean;
  recovered_labels: string[];
  false_positives: string[];
  false_negatives: string[];
  disagreement_notes?: string;
}

export interface EvaluationSummary {
  run_at: string;
  evaluation_mode: 'c01_official' | 'granular_taxonomy';
  total_samples: number;
  target_recovery_threshold: number; // 16
  recovered_label_count: number; // total agreed labels recovered
  exact_match_count: number;
  exact_match_rate: number;
  precision: number;
  recall: number;
  f1_score: number;
  taxonomy_mapping_notes?: string;
  category_metrics: {
    category: string;
    support: number;
    true_positives: number;
    false_positives: number;
    false_negatives: number;
    precision: number;
    recall: number;
    f1: number;
  }[];
  records: EvaluationRecord[];
}

export interface BusinessPlanAssumptions {
  monthly_subscription_usd: number;
  subscribing_stores: number;
  gemini_api_cost_per_1k_reviews: number;
  monthly_hosting_usd: number;
  support_cost_per_store_usd: number;
  onboarding_cost_per_store_usd: number;
  other_opex_monthly_usd: number;
  customer_acquisition_cost_usd: number;
  estimated_monthly_churn_pct: number;
  average_reviews_per_store_monthly: number;
  scenario: 'conservative' | 'base' | 'optimistic';
}

export interface CustomerInterview {
  interview_id: string;
  participant_role: string;
  organization_type: string;
  contact_date: string;
  contact_status: 'Planned' | 'Contacted' | 'Scheduled' | 'Completed' | 'Follow-up required';
  existing_workflow: string;
  biggest_pain_points: string;
  current_tools: string;
  estimated_hours_weekly: number;
  feedback_on_copilot: string;
  willingness_to_pilot: 'Eager' | 'Open with conditions' | 'Hesitant' | 'Not interested';
  follow_up_action: string;
  notes: string;
  is_verified_interview: boolean; // Must be false if planned / synthetic
}

export interface PilotExperiment {
  pilot_id: string;
  title: string;
  hypothesis: string;
  target_partner: string;
  start_date: string;
  end_date: string;
  status: 'Draft' | 'Active' | 'Under Review' | 'Completed';
  current_week: 1 | 2 | 3 | 4;
  baseline_processing_hours_weekly: number;
  trial_processing_hours_weekly?: number;
  action_acceptance_rate_pct?: number;
  decision_turnaround_days?: number;
  issues_investigated_count?: number;
  key_findings: string;
  limitations: string;
  next_steps: string;
  weekly_milestones: {
    week: number;
    title: string;
    goal: string;
    status: 'Pending' | 'In Progress' | 'Done';
    notes: string;
  }[];
}

export interface ActionCostAssumption {
  id: string;
  action_type: string;
  department: TeamDepartment;
  estimated_cost_usd: number;
  cost_inr?: number;
  currency?: 'INR' | 'USD';
  implementation_time_days: number;
  expected_return_reduction_pct: number;
  description: string;
}

export interface AppSettings {
  prioritization_weights: {
    severity_weight: number; // 0-1
    volume_weight: number; // 0-1
    spread_weight: number; // 0-1
  };
  classification_mode: 'gemini_with_fallback' | 'deterministic_only';
  duplicate_similarity_threshold: number; // 0.8
  workspace_name: string;
  merchant_currency: string;
}

export interface UserAccount {
  user_id: string;
  name: string;
  email: string;
  store_name: string;
  role: string;
  created_at: string;
  avatar_url?: string;
}

export interface AuthSession {
  token: string;
  user: UserAccount;
}
