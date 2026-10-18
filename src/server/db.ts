import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Review,
  CorrectiveAction,
  DecisionVersion,
  AuditLogEntry,
  CustomerInterview,
  PilotExperiment,
  AppSettings,
  BusinessPlanAssumptions,
  ActionCostAssumption,
  IssueSummary,
  IssueCategory,
  SeverityLevel,
  TeamDepartment,
  UserAccount
} from '../types';
import {
  STARTER_REVIEWS_FIXTURE,
  INITIAL_SETTINGS,
  INITIAL_BUSINESS_ASSUMPTIONS,
  ACTION_COST_TABLE,
  INITIAL_CUSTOMER_INTERVIEWS,
  INITIAL_PILOT_EXPERIMENT
} from './seedData';

const DATA_DIR = path.resolve(process.env.MERCHANTIQ_DATA_DIR || path.join(process.cwd(), 'data'));
const DB_FILE = path.join(DATA_DIR, 'merchant_intelligence_db.json');

export interface UserRecord {
  user_id: string;
  workspace_id: string;
  name: string;
  email: string;
  store_name: string;
  role: string;
  password_hash: string;
  salt: string;
  created_at: string;
  last_login_at?: string;
  auth_provider: 'password' | 'google';
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
  } catch {
    return false;
  }
}

export interface ImportJob {
  job_id: string;
  workspace_id?: string;
  filename: string;
  imported_at: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_candidates: number;
  status: 'completed' | 'partial' | 'failed';
  errors: { row: number; field: string; message: string }[];
}

export interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  reviews: Review[];
  actions: CorrectiveAction[];
  decisions: DecisionVersion[];
  auditLogs: AuditLogEntry[];
  interviews: CustomerInterview[];
  pilots: PilotExperiment[];
  settings: AppSettings;
  businessAssumptions: BusinessPlanAssumptions;
  actionCostTable: ActionCostAssumption[];
  importJobs: ImportJob[];
  settingsByWorkspace?: Record<string, AppSettings>;
  businessAssumptionsByWorkspace?: Record<string, BusinessPlanAssumptions>;
}

export const LEGACY_WORKSPACE_ID = 'legacy-quarantine';

export interface SessionRecord {
  session_id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
}

export function normalizeReviewText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textSimilarity(left: string, right: string): number {
  const leftTokens = new Set(normalizeReviewText(left).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeReviewText(right).split(' ').filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / new Set([...leftTokens, ...rightTokens]).size;
}

export class Store {
  private data: DatabaseSchema;

  constructor(seedDefaults = true) {
    this.data = seedDefaults ? this.load() : this.getDefaultState();
    if (!seedDefaults) {
      this.data.reviews = [];
      this.data.importJobs = [];
    }
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private getDefaultState(): DatabaseSchema {
    const initialActions: CorrectiveAction[] = [
      {
        action_id: 'ACT-001',
        issue_category: 'manufacturing_defects',
        issue_title: 'Garment Seam & Zipper Assembly Failures',
        affected_products: ['PROD-JACKET-12', 'PROD-PANTS-11'],
        recommended_action: 'Audit tier-1 apparel stitching machines and reinforce zipper teeth pull-strength specification.',
        rationale: 'Multiple unique returns reported broken teeth and unstitched pocket seams within first week of wear.',
        assigned_team: 'Supplier Management',
        owner_name: 'Elena Rostova (QA Lead)',
        priority: 'P1 - High',
        severity: 'high',
        estimated_cost_usd: 650,
        expected_benefit: 'Estimated 22% reduction in apparel warranty returns ($1,420 monthly return handling savings).',
        status: 'Approved',
        due_date: '2026-10-28',
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-16T11:30:00Z',
        reviewer_notes: 'Scope adjusted from 4 products down to the top 2 verified jacket/pants models to focus supplier testing.',
        supporting_review_ids: ['R004', 'R017'],
        is_negotiated: true
      },
      {
        action_id: 'ACT-002',
        issue_category: 'functional_failures',
        issue_title: 'Thermal Cord Safety Arcing & Thermostat Cutoff',
        affected_products: ['PROD-HEAT-03'],
        recommended_action: 'Immediate factory quarantine of power cord lot #26-09 and independent electrical resistance lab certification.',
        rationale: 'Smoke and electrical sparks reported. Critical life-safety risk taking priority over routine high-volume cosmetic flaws.',
        assigned_team: 'Quality Assurance',
        owner_name: 'Marcus Vance (Safety Director)',
        priority: 'P0 - Critical',
        severity: 'critical',
        estimated_cost_usd: 950,
        expected_benefit: 'Zero liability incidents, prevents catastrophic recall and customer safety damage.',
        status: 'In Progress',
        due_date: '2026-10-22',
        created_at: '2026-10-16T08:00:00Z',
        updated_at: '2026-10-16T14:00:00Z',
        reviewer_notes: 'P0 expedited action. Contacted supplier electrical engineer immediately.',
        supporting_review_ids: ['R003', 'R014'],
        is_negotiated: false
      },
      {
        action_id: 'ACT-003',
        issue_category: 'packaging_problems',
        issue_title: 'Transit Drop Shock and Glass Container Breakage',
        affected_products: ['PROD-BLEND-08', 'PROD-GIFT-02'],
        recommended_action: 'Upgrade shipper cartons to double-wall corrugated 250 GSM and mandate molded pulp corner inserts.',
        rationale: 'Glass screens and blender pitchers fractured due to zero bubble cushioning and flat carton compression.',
        assigned_team: 'Packaging & Unboxing',
        owner_name: 'Liam Chen (Packaging Spec Lead)',
        priority: 'P1 - High',
        severity: 'high',
        estimated_cost_usd: 420,
        expected_benefit: 'Expected 35% reduction in transit breakage claims.',
        status: 'Under Review',
        due_date: '2026-10-30',
        created_at: '2026-10-16T11:00:00Z',
        updated_at: '2026-10-16T11:00:00Z',
        reviewer_notes: 'Samples of molded pulp inserts requested from regional corrugated partner.',
        supporting_review_ids: ['R002', 'R013'],
        is_negotiated: false
      }
    ];

    const initialDecisions: DecisionVersion[] = [
      {
        decision_id: 'DEC-001',
        issue_category: 'manufacturing_defects',
        issue_title: 'Apparel Seam & Zipper Integrity',
        timestamp: '2026-10-16T11:30:00Z',
        created_by: 'Elena Rostova (Merchant Quality Lead)',
        original_ranking: 1,
        original_scope_product_ids: ['PROD-JACKET-12', 'PROD-PANTS-11', 'PROD-KNIT-07', 'PROD-UNKNOWN'],
        original_recommendation: 'Issue blanket supplier warning across all 4 apparel SKUs and halt all apparel shipments.',
        original_team: 'Manufacturing & Production',
        original_priority: 'P1 - High',
        final_scope_product_ids: ['PROD-JACKET-12', 'PROD-PANTS-11'],
        final_corrective_action: 'Prioritize physical factory pull-test on Alpine Jacket zippers and pocket seam tension for Commuter Chino only; keep knitwear active pending further data.',
        final_team: 'Supplier Management',
        final_priority: 'P1 - High',
        scope_change_reason: 'Apparel halt would damage critical Q4 sales; focused inspection on 2 confirmed high-frequency SKUs isolates root cause without revenue disruption.',
        evidence_reviewed_count: 3,
        negotiation_notes: 'Negotiated with Operations VP. Knitted sweater button pop was isolated to 1 review and rated low severity, so removed from immediate batch audit.',
        status: 'Agreed',
        version: 1
      }
    ];

    const initialAudit: AuditLogEntry[] = [
      {
        log_id: 'AUD-001',
        event_type: 'IMPORT_COMPLETED',
        entity_id: 'FIXTURE_C01',
        entity_type: 'dataset',
        timestamp: '2026-10-16T14:30:00Z',
        user: 'System Seed Service',
        details: 'Ingested 20 starter judge reviews from official fixture. Deduplicated duplicate candidates.'
      },
      {
        log_id: 'AUD-002',
        event_type: 'ANALYSIS_RUN',
        entity_id: 'RUN-20261016',
        entity_type: 'review',
        timestamp: '2026-10-16T14:31:00Z',
        user: 'Gemini Intelligence Engine',
        details: 'Classified 20 reviews with multi-label extraction and citation evidence.'
      },
      {
        log_id: 'AUD-003',
        event_type: 'SCOPE_NEGOTIATED',
        entity_id: 'DEC-001',
        entity_type: 'decision',
        timestamp: '2026-10-16T15:00:00Z',
        user: 'Elena Rostova (Quality Lead)',
        previous_value: 'Scope: 4 products (blanket factory halt)',
        new_value: 'Scope: 2 products (targeted zipper/seam audit)',
        details: 'Negotiated scope to balance defect remediation with merchant sales continuity.'
      }
    ];

    const initialImportJob: ImportJob = {
      job_id: 'JOB-20261016-01',
      filename: 'Starter_Data/C01/fixture.json',
      imported_at: '2026-10-16T14:30:00Z',
      total_rows: 20,
      valid_rows: 20,
      invalid_rows: 0,
      duplicate_candidates: 1,
      status: 'completed',
      errors: []
    };

    return {
      users: [],
      sessions: [],
      reviews: STARTER_REVIEWS_FIXTURE,
      actions: initialActions,
      decisions: initialDecisions,
      auditLogs: initialAudit,
      interviews: INITIAL_CUSTOMER_INTERVIEWS,
      pilots: [INITIAL_PILOT_EXPERIMENT],
      settings: INITIAL_SETTINGS,
      businessAssumptions: INITIAL_BUSINESS_ASSUMPTIONS,
      actionCostTable: ACTION_COST_TABLE,
      importJobs: [initialImportJob]
      ,settingsByWorkspace: {}
      ,businessAssumptionsByWorkspace: {}
    };
  }

  private load(): DatabaseSchema {
    try {
      this.ensureDir();
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.reviews)) {
          if (!Array.isArray(parsed.users)) parsed.users = [];
          if (!Array.isArray(parsed.sessions)) parsed.sessions = [];
          parsed.users = parsed.users.map((user: UserRecord) => ({
            ...user,
            workspace_id: user.workspace_id || `WS-${user.user_id}`
          }));
          if (!parsed.settingsByWorkspace || typeof parsed.settingsByWorkspace !== 'object') {
            parsed.settingsByWorkspace = {};
          }
          if (!parsed.businessAssumptionsByWorkspace || typeof parsed.businessAssumptionsByWorkspace !== 'object') {
            parsed.businessAssumptionsByWorkspace = {};
          }
          this.reconcileDuplicateMetadata(parsed);
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read existing db.json, initializing fresh default state:', e);
    }
    const defaultState = this.getDefaultState();
    this.save(defaultState);
    return defaultState;
  }

  private reconcileDuplicateMetadata(data: DatabaseSchema): void {
    const groups = new Map<string, Review[]>();
    for (const review of data.reviews) {
      const key = review.workspace_id || '';
      const group = groups.get(key) || [];
      group.push(review);
      groups.set(key, group);
    }

    for (const reviews of groups.values()) {
      for (let index = 0; index < reviews.length; index += 1) {
        const review = reviews[index];
        if (review.duplicate_of) continue;
        const normalizedText = normalizeReviewText(review.review_text);
        const prior = reviews.slice(0, index).find((candidate) => {
          return (
            normalizeReviewText(candidate.review_text) === normalizedText &&
            candidate.product_id === review.product_id
          );
        });
        if (prior) {
          review.is_duplicate_candidate = true;
          review.duplicate_of = prior.review_id;
          review.duplicate_similarity = 1;
          review.duplicate_reason = `Identical review text and product to review ${prior.review_id}.`;
        }
      }
    }
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDir();
      const payload = dataToSave || this.data;
      const jsonContent = JSON.stringify(payload, null, 2);
      const tempFile = path.join(
        DATA_DIR,
        `db.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`
      );
      fs.writeFileSync(tempFile, jsonContent, 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
      console.error('Failed to write database file atomically:', e);
      throw new Error('Database write failed.');
    }
  }

  // REVIEWS
  private owned<T extends { workspace_id?: string }>(records: T[], workspaceId?: string): T[] {
    if (!workspaceId) return records.filter((record) => !record.workspace_id);
    return records.filter((record) => record.workspace_id === workspaceId);
  }

  public getReviews(workspaceId?: string): Review[] {
    return this.owned(this.data.reviews, workspaceId);
  }

  public getQuarantinedReviews(): Review[] {
    return this.getReviews();
  }

  public getReviewById(id: string, workspaceId?: string): Review | undefined {
    return this.getReviews(workspaceId).find((r) => r.review_id === id);
  }

  public saveReview(updated: Review, workspaceId?: string): Review {
    const ownerWorkspace = workspaceId ?? updated.workspace_id;
    if (ownerWorkspace) updated.workspace_id = ownerWorkspace;
    // getReviews returns references to the stored objects, so prefer exact
    // identity. Review IDs can be shared by canonical and confirmed duplicate rows.
    let idx = this.data.reviews.indexOf(updated);
    if (idx < 0) {
      idx = this.data.reviews.findIndex((r) =>
        r.review_id === updated.review_id &&
        r.workspace_id === ownerWorkspace &&
        (r.duplicate_of ?? '') === (updated.duplicate_of ?? '')
      );
    }
    if (idx >= 0) {
      this.data.reviews[idx] = updated;
    } else {
      this.data.reviews.push(updated);
    }
    this.save();
    return updated;
  }

  public updateReviewIssues(
    reviewId: string,
    issues: Review['issues'],
    notes?: string,
    user?: string,
    workspaceId?: string
  ): Review | undefined {
    const r = this.getReviewById(reviewId, workspaceId);
    if (!r) return undefined;
    const oldCategories = r.issues.map((i) => i.category).join(', ');
    r.issues = issues;
    r.analysis_method = 'manual_override';
    r.needs_human_review = false;
    if (notes) r.user_notes = notes;
    this.save();

    this.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'LABEL_CORRECTION',
      entity_id: reviewId,
      entity_type: 'review',
      timestamp: new Date().toISOString(),
      user: user || 'Merchant Quality Lead',
      previous_value: oldCategories,
      new_value: issues.map((i) => i.category).join(', '),
      details: notes || 'Manual label adjustment by reviewer'
    });

    return r;
  }

  public importReviews(newReviews: Review[], job: ImportJob, workspaceId?: string): { added: number; updated: number; total: number } {
    let added = 0;
    let updated = 0;

    // Detect duplicate candidates based on text similarity or identical IDs
    const existingMap = new Map<string, Review>();
    const workingReviews = this.getReviews(workspaceId);
    workingReviews.forEach((r) => existingMap.set(r.review_id, r));

    let detectedDuplicateCandidates = 0;

    for (const incoming of newReviews) {
      if (workspaceId) incoming.workspace_id = workspaceId;
      if (existingMap.has(incoming.review_id)) {
        // Update existing record without inflating duplicate counts
        const idx = this.data.reviews.findIndex((r) => r.review_id === incoming.review_id && r.workspace_id === workspaceId);
        if (idx >= 0) {
          const existing = this.data.reviews[idx];
          this.data.reviews[idx] = {
            ...existing,
            ...incoming,
            // preserve any manual overrides
            issues: existing.analysis_method === 'manual_override'
              ? existing.issues
              : incoming.issues
          };
          if (incoming.duplicate_of === undefined && existing.duplicate_of !== undefined) {
            this.data.reviews[idx].duplicate_of = existing.duplicate_of;
          }
          if (incoming.is_duplicate_candidate === undefined && existing.is_duplicate_candidate !== undefined) {
            this.data.reviews[idx].is_duplicate_candidate = existing.is_duplicate_candidate;
          }
          if (incoming.duplicate_similarity === undefined && existing.duplicate_similarity !== undefined) {
            this.data.reviews[idx].duplicate_similarity = existing.duplicate_similarity;
          }
          if (incoming.duplicate_reason === undefined && existing.duplicate_reason !== undefined) {
            this.data.reviews[idx].duplicate_reason = existing.duplicate_reason;
          }
          updated++;
        }
      } else {
        const existingReviews = workingReviews;
        const explicitCanonical = incoming.duplicate_of
          ? existingReviews.find((review) => review.review_id === incoming.duplicate_of)
          : undefined;
        const normalizedIncoming = normalizeReviewText(incoming.review_text);
        let bestMatch: { review: Review; similarity: number } | undefined;

        for (const existing of existingReviews) {
          const similarity = textSimilarity(incoming.review_text, existing.review_text);
          const sameProduct = existing.product_id === incoming.product_id;
          const exactText = normalizedIncoming === normalizeReviewText(existing.review_text);
          if (
            (sameProduct && exactText) ||
            (sameProduct && similarity >= this.getSettings(workspaceId).duplicate_similarity_threshold) ||
            (!sameProduct && exactText)
          ) {
            if (!bestMatch || similarity > bestMatch.similarity) {
              bestMatch = { review: existing, similarity };
            }
          }
        }

        const match = explicitCanonical || bestMatch?.review;
        if (match) {
          const similarity = explicitCanonical ? 1 : bestMatch?.similarity || 0;
          const sameProduct = match.product_id === incoming.product_id;
          const exactText = normalizedIncoming === normalizeReviewText(match.review_text);
          incoming.is_duplicate_candidate = true;
          incoming.duplicate_similarity = similarity;
          incoming.duplicate_reason = explicitCanonical
            ? `Explicit duplicate relationship to review ${match.review_id}.`
            : exactText
            ? `Identical review text ${sameProduct ? 'and product' : 'across products'} to review ${match.review_id}.`
            : `Similar review text and product to review ${match.review_id}.`;
          if (explicitCanonical || (sameProduct && exactText)) {
            incoming.duplicate_of = match.review_id;
          } else {
            incoming.duplicate_of = undefined;
          }
          detectedDuplicateCandidates++;
        }
        this.data.reviews.push(incoming);
        workingReviews.push(incoming);
        existingMap.set(incoming.review_id, incoming);
        added++;
      }
    }

    job.duplicate_candidates = Math.max(job.duplicate_candidates, detectedDuplicateCandidates);
    this.data.importJobs.unshift(job);
    this.save();

    this.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'IMPORT_COMPLETED',
      entity_id: job.job_id,
      entity_type: 'dataset',
      timestamp: new Date().toISOString(),
      user: 'Merchant User',
      details: `Imported ${job.filename}: ${added} added, ${updated} reconciled, ${job.duplicate_candidates} duplicates flagged.`,
      workspace_id: workspaceId
    });

    return { added, updated, total: this.getReviews(workspaceId).length };
  }

  // OFFICIAL C01 DATASET LOADER (Idempotent, preserves R001-R020 IDs, separates predictions from reference labels)
  public loadOfficialC01(workspaceId?: string): {
    added: number;
    updated: number;
    total: number;
    unique_valid: number;
    confirmed_duplicates: number;
    job: ImportJob;
  } {
    let reviewsToLoad: Review[] = STARTER_REVIEWS_FIXTURE;

    const fixtureCandidates = [
      '/Starter_Data/C01/fixture.json',
      '/starter-data/C01/fixture.json',
      path.resolve(process.cwd(), 'Starter_Data/C01/fixture.json'),
      path.resolve(process.cwd(), 'starter-data/C01/fixture.json')
    ];

    for (const p of fixtureCandidates) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.reviews) && parsed.reviews.length === 20) {
            reviewsToLoad = parsed.reviews.map((pr: any) => {
              const defaultReview = STARTER_REVIEWS_FIXTURE.find((s) => s.review_id === pr.review_id);
              return {
                review_id: pr.review_id,
                product_id: pr.product_id,
                product_name:
                  defaultReview?.product_name ||
                  (pr.product_id === 'PROD-UNKNOWN' ? 'Unknown Product' : pr.product_id),
                review_text: pr.review_text,
                rating: pr.rating,
                created_at: pr.created_at,
                issues: defaultReview?.issues || [],
                sentiment: defaultReview?.sentiment || (pr.rating >= 4 ? 'positive' : 'negative'),
                analysis_method: defaultReview?.analysis_method || 'gemini_ai',
                analyzed_at: defaultReview?.analyzed_at || new Date().toISOString(),
                needs_human_review: defaultReview?.needs_human_review || false,
                duplicate_of: typeof pr.duplicate_of === 'string' ? pr.duplicate_of : undefined,
                is_duplicate_candidate: pr.is_duplicate_candidate === true ? true : undefined,
                duplicate_similarity:
                  typeof pr.duplicate_similarity === 'number' ? pr.duplicate_similarity : undefined,
                duplicate_reason: typeof pr.duplicate_reason === 'string' ? pr.duplicate_reason : undefined
              };
            });
            break;
          }
        } catch (e) {
          console.warn('Could not parse fixture JSON, falling back to embedded reviews:', e);
        }
      }
    }

    const job: ImportJob = {
      job_id: `JOB-C01-${Date.now()}`,
      filename: 'Starter_Data/C01/fixture.json',
      imported_at: new Date().toISOString(),
      total_rows: reviewsToLoad.length,
      valid_rows: reviewsToLoad.length,
      invalid_rows: 0,
      duplicate_candidates: 0,
      status: 'completed',
      errors: []
    };

    const importRes = this.importReviews(reviewsToLoad, job, workspaceId);
    const stats = this.getUniqueReviewStats(workspaceId);

    return {
      added: importRes.added,
      updated: importRes.updated,
      total: importRes.total,
      unique_valid: stats.valid_unique_reviews,
      confirmed_duplicates: stats.confirmed_duplicates,
      job
    };
  }

  // DUPLICATE RESOLUTION
  public resolveDuplicate(reviewId: string, markAsDuplicate: boolean, user?: string, workspaceId?: string): Review | undefined {
    const r = this.getReviewById(reviewId, workspaceId);
    if (!r) return undefined;

    const oldStatus = r.duplicate_of ? 'Duplicate' : 'Distinct';
    if (markAsDuplicate) {
      r.is_duplicate_candidate = true;
    } else {
      r.is_duplicate_candidate = false;
      r.duplicate_of = undefined;
      r.duplicate_reason = 'Confirmed as distinct review by quality analyst.';
    }
    this.save();

    this.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'DUPLICATE_RESOLVED',
      entity_id: reviewId,
      entity_type: 'review',
      timestamp: new Date().toISOString(),
      user: user || 'Quality Lead',
      previous_value: oldStatus,
      new_value: markAsDuplicate ? 'Duplicate' : 'Distinct',
      details: `Resolved duplicate status for ${reviewId}`
      ,workspace_id: workspaceId
    });

    return r;
  }

  // AGGREGATIONS & METRICS (Respects unique counting rules)
  public getUniqueReviewStats(workspaceId?: string) {
    const all = this.getReviews(workspaceId);
    const confirmedDuplicates = all.filter((r) => Boolean(r.duplicate_of));
    const suspectedDuplicates = all.filter((r) => r.is_duplicate_candidate && !r.duplicate_of);
    const uniqueReviews = all.filter((r) => !r.duplicate_of);

    return {
      total_imported_records: all.length,
      valid_unique_reviews: uniqueReviews.length,
      confirmed_duplicates: confirmedDuplicates.length,
      suspected_duplicates: suspectedDuplicates.length
    };
  }

  public getIssuesSummary(workspaceId?: string): IssueSummary[] {
    const categoryMap = new Map<
      IssueCategory,
      {
        uniqueReviewIds: Set<string>;
        affectedProducts: Set<string>;
        highestSeverity: SeverityLevel;
        confidences: number[];
        uncertainCount: number;
        citations: {
          review_id: string;
          product_id: string;
          quote: string;
          rating: number;
          created_at: string;
        }[];
      }
    >();

    const severityRanks: Record<SeverityLevel, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      uncertain: 0
    };

    // Counting rule: A review mentioning 2 issues counts once in each category, but once overall.
    // Exclude confirmed duplicates from inflating counts or triggering actions!
    const activeReviews = this.getReviews(workspaceId).filter((r) => !r.duplicate_of);

    for (const review of activeReviews) {
      for (const issue of review.issues) {
        if (!categoryMap.has(issue.category)) {
          categoryMap.set(issue.category, {
            uniqueReviewIds: new Set(),
            affectedProducts: new Set(),
            highestSeverity: 'low',
            confidences: [],
            uncertainCount: 0,
            citations: []
          });
        }
        const bucket = categoryMap.get(issue.category)!;
        bucket.uniqueReviewIds.add(review.review_id);
        bucket.affectedProducts.add(review.product_id || 'PROD-UNKNOWN');
        bucket.confidences.push(issue.confidence || 0.85);

        if (issue.severity === 'uncertain' || issue.category === 'uncertain') {
          bucket.uncertainCount++;
        }

        if (severityRanks[issue.severity] > severityRanks[bucket.highestSeverity]) {
          bucket.highestSeverity = issue.severity;
        }

        // Add citation if not already present
        if (!bucket.citations.some((c) => c.review_id === review.review_id)) {
          bucket.citations.push({
            review_id: review.review_id,
            product_id: review.product_id || 'PROD-UNKNOWN',
            quote: issue.evidence || review.review_text,
            rating: review.rating,
            created_at: review.created_at
          });
        }
      }
    }

    const { severity_weight, volume_weight, spread_weight } = this.data.settings.prioritization_weights;

    const categoryMeta: Record<
      IssueCategory,
      {
        title: string;
        desc: string;
        action: string;
        team: TeamDepartment;
      }
    > = {
      manufacturing_defects: {
        title: 'Manufacturing & Assembly Defects',
        desc: 'Component failures, broken zippers, seam tears, loose stitching, and assembly defects.',
        action: 'Conduct factory line audit, inspect seam tension tolerances, and audit fastener batches.',
        team: 'Supplier Management'
      },
      functional_failures: {
        title: 'Electrical & Functional Failures',
        desc: 'Thermal runaway, sparking power cords, motor burnouts, and sensor controller faults.',
        action: 'Mandate safety quarantine on electrical power lots and commission independent thermal resistance testing.',
        team: 'Quality Assurance'
      },
      product_damage: {
        title: 'Product Damage in Transit / Unboxing',
        desc: 'Fractured glass, dented frames, cracked housings, and scuffed surfaces upon delivery.',
        action: 'Upgrade shipper corrugated box grade to 250 GSM and mandate molded pulp edge buffers.',
        team: 'Packaging & Unboxing'
      },
      packaging_problems: {
        title: 'Packaging & Inadequate Cushioning',
        desc: 'Crushed retail boxes, zero bubble wrap, burst tape, and damaged presentation packaging.',
        action: 'Perform ISTA drop-testing on fulfillment pack configurations; reinforce corners.',
        team: 'Packaging & Unboxing'
      },
      incorrect_sizing: {
        title: 'Sizing & Pattern Fit Discrepancies',
        desc: 'Garments running significantly tighter or looser than digital dimension charts.',
        action: 'Remount physical garment samples on dress forms; calibrate sizing guide with actual fit notes.',
        team: 'Product Management'
      },
      missing_component: {
        title: 'Missing Parts & Incomplete Kits',
        desc: 'Hardware accessory packs, bolts, power supplies, or tools absent from sealed boxes.',
        action: 'Implement barcode double-scan verification at kitting stations before box seal.',
        team: 'Logistics & Warehousing'
      },
      poor_product_quality: {
        title: 'Poor Material Durability & Wear',
        desc: 'Premature sole abrasion, sheer see-through textiles, fabric shrinkage, and weak yarn.',
        action: 'Re-negotiate raw material specifications with textile mill; raise minimum fabric GSM.',
        team: 'Manufacturing & Production'
      },
      incorrect_item_delivered: {
        title: 'Mishandled Fulfillment / Wrong Item Sent',
        desc: 'Warehouse mis-picks resulting in customer receiving wrong color, model, or product entirely.',
        action: 'Audit warehouse SKU bin labeling and enforce bin barcode scanning prior to packing.',
        team: 'Logistics & Warehousing'
      },
      delivery_related_issues: {
        title: 'Carrier Logistics & Delivery Mishandling',
        desc: 'Late transit, packages left in rain, rough courier handling outside product control.',
        action: 'Escalate carrier SLA breach with 3PL delivery partner; audit weather-resistant polybag sealing.',
        team: 'Logistics & Warehousing'
      },
      other: {
        title: 'General Customer Feedback',
        desc: 'Miscellaneous merchant feedback not matching core defect categories.',
        action: 'Triage feedback during weekly customer experience review.',
        team: 'Customer Support'
      },
      uncertain: {
        title: 'Uncertain / Subjective Feedback',
        desc: 'Ambiguous expectations, subjective taste remarks, requiring human analyst review.',
        action: 'Assign to product specialist for manual qualitative review.',
        team: 'Customer Support'
      }
    };

    const summaries: IssueSummary[] = [];

    categoryMap.forEach((data, category) => {
      const meta = categoryMeta[category] || {
        title: category.replace(/_/g, ' '),
        desc: 'Detected issue group',
        action: 'Investigate reported customer feedback.',
        team: 'Quality Assurance'
      };

      const uniqueCount = data.uniqueReviewIds.size;
      const productCount = data.affectedProducts.size;
      const avgConfidence =
        data.confidences.reduce((a, b) => a + b, 0) / (data.confidences.length || 1);

      // Transparent Priority Score Formula:
      // Severity: critical=100, high=75, medium=45, low=20, uncertain=10
      // Volume: min(100, uniqueCount * 20)
      // Spread: min(100, productCount * 25)
      const severityScore =
        data.highestSeverity === 'critical'
          ? 100
          : data.highestSeverity === 'high'
          ? 75
          : data.highestSeverity === 'medium'
          ? 45
          : data.highestSeverity === 'low'
          ? 20
          : 10;
      const volumeScore = Math.min(100, uniqueCount * 22);
      const spreadScore = Math.min(100, productCount * 30);

      // Critical low-volume escalation rule:
      // If critical severity, ensure base priority score is >= 85 regardless of count!
      let priorityScore = Math.round(
        severityScore * severity_weight + volumeScore * volume_weight + spreadScore * spread_weight
      );

      if (data.highestSeverity === 'critical' && priorityScore < 85) {
        priorityScore = 88; // Escalated for human safety review
      }

      // Check if any open action exists
      const existingAction = this.data.actions.find((a) => a.issue_category === category);
      const investigation_status: IssueSummary['investigation_status'] = existingAction
        ? existingAction.status === 'Completed'
          ? 'resolved'
          : existingAction.status === 'Approved' || existingAction.status === 'In Progress'
          ? 'under_investigation'
          : 'action_proposed'
        : 'unassigned';

      summaries.push({
        category,
        title: meta.title,
        description: meta.desc,
        unique_review_count: uniqueCount,
        review_ids: Array.from(data.uniqueReviewIds),
        affected_products: Array.from(data.affectedProducts),
        severity: data.highestSeverity,
        average_confidence: Math.round(avgConfidence * 100) / 100,
        uncertain_count: data.uncertainCount,
        priority_score: priorityScore,
        supporting_citations: data.citations,
        suggested_action: meta.action,
        default_owner_team: meta.team,
        investigation_status
      });
    });

    // Sort by priority score descending
    return summaries.sort((a, b) => b.priority_score - a.priority_score);
  }

  public getProductsSummary(workspaceId?: string) {
    const productMap = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        unique_reviews: Set<string>;
        issue_categories: Set<IssueCategory>;
        highest_severity: SeverityLevel;
        latest_review_date: string;
        ratings: number[];
      }
    >();

    const severityRanks: Record<SeverityLevel, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      uncertain: 0
    };

    const activeReviews = this.getReviews(workspaceId).filter((r) => !r.duplicate_of);

    for (const r of activeReviews) {
      const pid = r.product_id || 'PROD-UNKNOWN';
      const pname = r.product_name || (pid === 'PROD-UNKNOWN' ? 'Unknown Product' : `Product ${pid}`);

      if (!productMap.has(pid)) {
        productMap.set(pid, {
          product_id: pid,
          product_name: pname,
          unique_reviews: new Set(),
          issue_categories: new Set(),
          highest_severity: 'low',
          latest_review_date: r.created_at,
          ratings: []
        });
      }

      const p = productMap.get(pid)!;
      p.unique_reviews.add(r.review_id);
      p.ratings.push(r.rating);

      if (new Date(r.created_at) > new Date(p.latest_review_date)) {
        p.latest_review_date = r.created_at;
      }

      for (const issue of r.issues) {
        p.issue_categories.add(issue.category);
        if (severityRanks[issue.severity] > severityRanks[p.highest_severity]) {
          p.highest_severity = issue.severity;
        }
      }
    }

    const result = Array.from(productMap.values()).map((p) => {
      const avgRating =
        p.ratings.reduce((a, b) => a + b, 0) / (p.ratings.length || 1);
      const openActions = this.getActions(workspaceId).filter(
        (a) => a.affected_products.includes(p.product_id) && a.status !== 'Completed'
      );

      return {
        product_id: p.product_id,
        product_name: p.product_name,
        total_unique_reviews: p.unique_reviews.size,
        review_ids: Array.from(p.unique_reviews),
        supporting_reviews: this.getReviews(workspaceId)
          .filter((review) => review.product_id === p.product_id && !review.duplicate_of)
          .sort((left, right) => {
            const severityRank = (review: Review) =>
              Math.max(...review.issues.map((issue) => severityRanks[issue.severity]), 0);
            const severityDifference = severityRank(right) - severityRank(left);
            if (severityDifference !== 0) return severityDifference;
            return left.rating - right.rating;
          })
          .slice(0, 3)
          .map((review) => ({
            review_id: review.review_id,
            rating: review.rating,
            review_text: review.review_text,
            detected_issues: review.issues.map((issue) => issue.category),
            highest_severity: review.issues.reduce<SeverityLevel>(
              (highest, issue) =>
                severityRanks[issue.severity] > severityRanks[highest] ? issue.severity : highest,
              'low'
            )
          })),
        issue_categories: Array.from(p.issue_categories),
        highest_severity: p.highest_severity,
        average_rating: Math.round(avgRating * 10) / 10,
        latest_review_date: p.latest_review_date,
        open_actions_count: openActions.length
      };
    });

    return result.sort((a, b) => b.total_unique_reviews - a.total_unique_reviews);
  }

  // ACTIONS
  public getActions(workspaceId?: string): CorrectiveAction[] {
    return this.owned(this.data.actions, workspaceId);
  }

  public createAction(action: CorrectiveAction, user?: string, workspaceId?: string): CorrectiveAction {
    if (workspaceId) action.workspace_id = workspaceId;
    this.data.actions.unshift(action);
    this.save();

    this.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'ACTION_CREATED',
      entity_id: action.action_id,
      entity_type: 'action',
      timestamp: new Date().toISOString(),
      user: user || 'Merchant Quality Lead',
      new_value: `${action.issue_title} -> ${action.assigned_team}`,
      details: `Created corrective action: ${action.recommended_action}`
    });

    return action;
  }

  public updateAction(
    actionId: string,
    updates: Partial<CorrectiveAction>,
    user?: string,
    workspaceId?: string
  ): CorrectiveAction | undefined {
    const idx = this.data.actions.findIndex((a) => a.action_id === actionId && a.workspace_id === workspaceId);
    if (idx < 0) return undefined;

    const old = this.data.actions[idx];
    const updated: CorrectiveAction = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.data.actions[idx] = updated;
    this.save();

    if (updates.status && updates.status !== old.status) {
      this.addAuditLog({
        log_id: `AUD-${Date.now()}`,
        event_type: 'ACTION_STATUS_CHANGED',
        entity_id: actionId,
        entity_type: 'action',
        timestamp: new Date().toISOString(),
        user: user || 'Quality Lead',
        previous_value: old.status,
        new_value: updates.status,
        details: updates.reviewer_notes || `Status transition from ${old.status} to ${updates.status}`
      });
    }

    if (updates.assigned_team && updates.assigned_team !== old.assigned_team) {
      this.addAuditLog({
        log_id: `AUD-${Date.now()}`,
        event_type: 'ACTION_ASSIGNED',
        entity_id: actionId,
        entity_type: 'action',
        timestamp: new Date().toISOString(),
        user: user || 'Quality Lead',
        previous_value: old.assigned_team,
        new_value: updates.assigned_team,
        details: `Reassigned action to ${updates.assigned_team}`
      });
    }

    return updated;
  }

  // DECISIONS (Mandatory hackathon side-by-side history preservation)
  public getDecisions(workspaceId?: string): DecisionVersion[] {
    return this.owned(this.data.decisions, workspaceId);
  }

  public saveDecision(decision: DecisionVersion, user?: string, workspaceId?: string): DecisionVersion {
    if (workspaceId) decision.workspace_id = workspaceId;
    const idx = this.data.decisions.findIndex((d) => d.decision_id === decision.decision_id && d.workspace_id === workspaceId);
    if (idx >= 0) {
      decision.version = this.data.decisions[idx].version + 1;
      this.data.decisions[idx] = decision;
    } else {
      decision.version = 1;
      this.data.decisions.unshift(decision);
    }
    this.save();

    this.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'SCOPE_NEGOTIATED',
      entity_id: decision.decision_id,
      entity_type: 'decision',
      timestamp: new Date().toISOString(),
      user: user || decision.created_by || 'Quality Lead',
      previous_value: `Original: ${decision.original_scope_product_ids.join(', ')}`,
      new_value: `Negotiated: ${decision.final_scope_product_ids.join(', ')}`,
      details: decision.scope_change_reason || 'Saved negotiated investigation scope'
    });

    return decision;
  }

  // AUDIT LOGS
  public getAuditLogs(workspaceId?: string): AuditLogEntry[] {
    return this.owned(this.data.auditLogs, workspaceId).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public addAuditLog(entry: AuditLogEntry) {
    this.data.auditLogs.unshift(entry);
    // Keep max 200 logs
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.save();
  }

  // INTERVIEWS & PILOTS
  public getInterviews(workspaceId?: string): CustomerInterview[] {
    return this.owned(this.data.interviews, workspaceId);
  }

  public saveInterview(interview: CustomerInterview, workspaceId?: string): CustomerInterview {
    if (workspaceId) interview.workspace_id = workspaceId;
    const idx = this.data.interviews.findIndex((i) => i.interview_id === interview.interview_id && i.workspace_id === workspaceId);
    if (idx >= 0) {
      this.data.interviews[idx] = interview;
    } else {
      this.data.interviews.push(interview);
    }
    this.save();
    return interview;
  }

  public getPilots(workspaceId?: string): PilotExperiment[] {
    return this.owned(this.data.pilots, workspaceId);
  }

  public savePilot(pilot: PilotExperiment, workspaceId?: string): PilotExperiment {
    if (workspaceId) pilot.workspace_id = workspaceId;
    const idx = this.data.pilots.findIndex((p) => p.pilot_id === pilot.pilot_id && p.workspace_id === workspaceId);
    if (idx >= 0) {
      this.data.pilots[idx] = pilot;
    } else {
      this.data.pilots.push(pilot);
    }
    this.save();
    return pilot;
  }

  // SETTINGS & BUSINESS
  public getSettings(workspaceId?: string): AppSettings {
    if (!workspaceId) return this.data.settings;
    return this.data.settingsByWorkspace?.[workspaceId] || { ...this.data.settings, workspace_id: workspaceId, workspace_name: '' };
  }

  public updateSettings(settings: Partial<AppSettings>, user?: string, workspaceId?: string): AppSettings {
    const updated = { ...this.getSettings(workspaceId), ...settings, workspace_id: workspaceId };
    if (workspaceId) this.data.settingsByWorkspace![workspaceId] = updated;
    else this.data.settings = updated;
    this.save();
    this.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'SETTINGS_UPDATED',
      entity_id: 'SYSTEM_SETTINGS',
      entity_type: 'dataset',
      timestamp: new Date().toISOString(),
      user: user || 'Merchant Admin',
      details: 'Updated app settings and scoring weights'
    });
    return updated;
  }

  public getBusinessAssumptions(workspaceId?: string): BusinessPlanAssumptions {
    if (!workspaceId) return this.data.businessAssumptions;
    return this.data.businessAssumptionsByWorkspace?.[workspaceId] || { ...this.data.businessAssumptions };
  }

  public updateBusinessAssumptions(
    assumptions: Partial<BusinessPlanAssumptions>,
    workspaceId?: string
  ): BusinessPlanAssumptions {
    const updated = { ...this.getBusinessAssumptions(workspaceId), ...assumptions };
    if (workspaceId) this.data.businessAssumptionsByWorkspace![workspaceId] = updated;
    else this.data.businessAssumptions = updated;
    this.save();
    return updated;
  }

  public getActionCostTable(): ActionCostAssumption[] {
    return this.data.actionCostTable;
  }

  // USERS & AUTHENTICATION
  public findUserByEmail(email: string): UserRecord | undefined {
    return this.data.users?.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users?.find((u) => u.user_id === id);
  }

  public createUser(user: UserRecord): UserRecord {
    if (!this.data.users) this.data.users = [];
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUserLastLogin(userId: string): void {
    const u = this.findUserById(userId);
    if (u) {
      u.last_login_at = new Date().toISOString();
      this.save();
    }
  }

  public verifyCredentials(email: string, password: string): UserRecord | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) return null;
    this.updateUserLastLogin(user.user_id);
    return user;
  }

  public createSession(session: SessionRecord): void {
    if (!this.data.sessions) this.data.sessions = [];
    this.data.sessions = this.data.sessions.filter((item) => new Date(item.expires_at).getTime() > Date.now());
    this.data.sessions.push(session);
    this.save();
  }

  public findSessionByTokenHash(tokenHash: string): SessionRecord | undefined {
    const session = (this.data.sessions || []).find((item) => item.token_hash === tokenHash);
    if (!session) return undefined;
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      this.deleteSession(session.session_id);
      return undefined;
    }
    return session;
  }

  public deleteSession(sessionId: string): void {
    this.data.sessions = (this.data.sessions || []).filter((item) => item.session_id !== sessionId);
    this.save();
  }

  // RESET
  public resetToDemo(): void {
    const def = this.getDefaultState();
    this.data = def;
    this.save(def);
  }
}

export const db = new Store();
