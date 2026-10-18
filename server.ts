import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db, ImportJob, hashPassword, UserRecord, SessionRecord } from './src/server/db';
import {
  classifyReview,
  runEvaluationBenchmark,
  ALLOWED_CATEGORIES,
  isGeminiConfigured
} from './src/server/classifier';
import { Review, CorrectiveAction, DecisionVersion } from './src/types';
import { normalizeReviewImportRows } from './src/import/parsing';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Utility for formula injection prevention in CSV exports
function sanitizeForCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  // If string starts with formula characters, prefix with single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'` + str;
  }
  return `"${str}"`;
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Health & Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai_available: isGeminiConfigured()
  });
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

const SESSION_COOKIE = 'merchantiq_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getCookie(req: Request, name: string): string | null {
  const cookies = req.headers.cookie?.split(';') || [];
  const entry = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_TTL_MS / 1000}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}

function clearSessionCookie(res: Response): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}

function getUserFromReq(req: Request): UserRecord | null {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const session = db.findSessionByTokenHash(hashSessionToken(token));
  return session ? db.findUserById(session.user_id) || null : null;
}

function getWorkspaceId(req: Request): string {
  const user = resLocalsUser(req);
  return user.workspace_id;
}

function resLocalsUser(req: Request): UserRecord {
  const user = (req as Request & { user?: UserRecord }).user;
  if (!user) throw new Error('Authenticated user context is missing.');
  return user;
}

function issueSession(res: Response, userId: string): void {
  const token = crypto.randomBytes(32).toString('base64url');
  db.createSession({
    session_id: crypto.randomUUID(),
    user_id: userId,
    token_hash: hashSessionToken(token),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString()
  });
  setSessionCookie(res, token);
}

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  return !origin || origin === `${req.protocol}://${req.get('host')}`;
}

app.get('/api/auth/config', (req: Request, res: Response) => {
  res.json({
    google_configured: Boolean(process.env.GOOGLE_CLIENT_ID),
    google_client_id: process.env.GOOGLE_CLIENT_ID || null
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ authenticated: false, message: 'Not authenticated' });
  }
  res.json({
    authenticated: true,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      store_name: user.store_name,
      role: user.role,
      workspace_id: user.workspace_id,
      created_at: user.created_at
    }
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Work email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const now = Date.now();
    const attempt = loginAttempts.get(normalizedEmail);
    if (attempt && attempt.resetAt > now && attempt.count >= 5) {
      return res.status(429).json({ error: 'Too many sign-in attempts. Please try again later.' });
    }
    const user = db.verifyCredentials(normalizedEmail, String(password));
    if (!user) {
      const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 15 * 60 * 1000 };
      current.count += 1;
      loginAttempts.set(normalizedEmail, current);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    loginAttempts.delete(normalizedEmail);

    issueSession(res, user.user_id);

    db.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'LABEL_CORRECTION' as any,
      entity_id: user.user_id,
      entity_type: 'review',
      timestamp: new Date().toISOString(),
      user: user.name,
      details: `Merchant user signed in: ${user.email} (${user.store_name})`
    });

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        store_name: user.store_name,
        role: user.role,
        workspace_id: user.workspace_id,
        created_at: user.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Authentication service error.' });
  }
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    if (!isSameOrigin(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
    const { name, email, store_name, password } = req.body;

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name (minimum 2 characters).' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(String(email).trim())) {
      return res.status(400).json({ error: 'Please enter a valid work email address.' });
    }

    if (!store_name || String(store_name).trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your business or store name.' });
    }

    if (!password || String(password).length < 8 || !/[A-Z]/.test(String(password)) || !/[a-z]/.test(String(password)) || !/[0-9]/.test(String(password))) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const { hash, salt } = hashPassword(String(password));
    const newUser: UserRecord = {
      user_id: `USR-${Date.now().toString().slice(-6)}`,
      workspace_id: `WS-${crypto.randomUUID()}`,
      name: String(name).trim(),
      email: normalizedEmail,
      store_name: String(store_name).trim(),
      role: 'Merchant Quality Lead',
      password_hash: hash,
      salt: salt,
      created_at: new Date().toISOString(),
      auth_provider: 'password'
    };

    db.createUser(newUser);
    issueSession(res, newUser.user_id);

    db.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'LABEL_CORRECTION' as any,
      entity_id: newUser.user_id,
      entity_type: 'review',
      timestamp: new Date().toISOString(),
      user: newUser.name,
      details: `New MerchantIQ account registered: ${newUser.name} for ${newUser.store_name}`
    });

    res.status(201).json({
      success: true,
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        store_name: newUser.store_name,
        role: newUser.role,
        workspace_id: newUser.workspace_id,
        created_at: newUser.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration service error.' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  const token = getCookie(req, SESSION_COOKIE);
  const session = token ? db.findSessionByTokenHash(hashSessionToken(token)) : undefined;
  if (session) db.deleteSession(session.session_id);
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      success: false,
      configured: false,
      error: 'Google OAuth Client ID is not configured in environment variables (GOOGLE_CLIENT_ID).'
    });
  }

  res.status(501).json({
    success: false,
    message: 'Google Cloud OAuth verification configured.'
  });
});

app.use('/api', (req: Request, res: Response, next) => {
  if (req.path === '/health' || req.path === '/auth/config' || req.path.startsWith('/auth/')) {
    return next();
  }
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  res.locals.user = user;
  (req as Request & { user?: UserRecord }).user = user;
  next();
});

// Reviews List & Filter
app.get('/api/reviews', (req: Request, res: Response) => {
  try {
    let reviews = db.getReviews(getWorkspaceId(req));
    const {
      product_id,
      category,
      severity,
      search,
      needs_review,
      include_duplicates
    } = req.query;

    if (include_duplicates !== 'true') {
      // Exclude confirmed duplicates from standard list unless requested
      reviews = reviews.filter((r) => !r.duplicate_of);
    }

    if (product_id) {
      reviews = reviews.filter((r) => r.product_id === product_id);
    }

    if (category) {
      reviews = reviews.filter((r) =>
        r.issues.some((i) => i.category === category)
      );
    }

    if (severity) {
      reviews = reviews.filter((r) =>
        r.issues.some((i) => i.severity === severity)
      );
    }

    if (needs_review === 'true') {
      reviews = reviews.filter((r) => r.needs_human_review);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      reviews = reviews.filter(
        (r) =>
          r.review_text.toLowerCase().includes(q) ||
          r.review_id.toLowerCase().includes(q) ||
          r.product_id.toLowerCase().includes(q) ||
          (r.product_name && r.product_name.toLowerCase().includes(q))
      );
    }

    res.json({ reviews, count: reviews.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single Review Details
app.get('/api/reviews/:id', (req: Request, res: Response) => {
  const r = db.getReviewById(req.params.id, getWorkspaceId(req));
  if (!r) return res.status(404).json({ error: 'Review not found' });
  res.json({ review: r });
});

// Update / Correct Review Label (Analyst Override)
app.patch('/api/reviews/:id', (req: Request, res: Response) => {
  try {
    const { issues, notes, user } = req.body;
    if (!issues || !Array.isArray(issues)) {
      return res.status(400).json({ error: 'issues must be an array' });
    }
    const updated = db.updateReviewIssues(req.params.id, issues, notes, user, getWorkspaceId(req));
    if (!updated) return res.status(404).json({ error: 'Review not found' });
    res.json({ review: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import Reviews (CSV or JSON parsed records)
app.post('/api/reviews/import', async (req: Request, res: Response) => {
  try {
    const { filename, records, auto_analyze } = req.body;
    const inputRecords = Array.isArray(records)
      ? records
      : Array.isArray(records?.reviews)
        ? records.reviews
        : Array.isArray(records?.records?.reviews)
          ? records.records.reviews
          : Array.isArray(records?.records)
            ? records.records
            : null;
    if (!inputRecords) {
      return res.status(400).json({ error: 'No review array found. Expected an array, reviews[], or records.reviews[].' });
    }

    const { validRecords, errors, duplicateCandidates } = normalizeReviewImportRows(inputRecords);
    const validReviews: Review[] = validRecords.map((record) => ({
      ...record,
      issues: [],
      analysis_method: 'unprocessed',
      needs_human_review: false
    }));
    // Optional Auto-classify on import
    if (auto_analyze && validReviews.length > 0) {
      for (const rev of validReviews) {
        const result = await classifyReview(rev, true);
        rev.issues = result.issues;
        rev.sentiment = result.sentiment;
        rev.needs_human_review = result.needs_human_review;
        rev.analysis_method = result.method;
        rev.analyzed_at = new Date().toISOString();
      }
    }

    const workspaceId = getWorkspaceId(req);
    const job: ImportJob = {
      job_id: `JOB-${Date.now()}`,
      workspace_id: workspaceId,
      filename: filename || 'manual_import.json',
      imported_at: new Date().toISOString(),
      total_rows: inputRecords.length,
      valid_rows: validReviews.length,
      invalid_rows: errors.length,
      duplicate_candidates: duplicateCandidates,
      status: errors.length === 0 ? 'completed' : validReviews.length > 0 ? 'partial' : 'failed',
      errors
    };

    if (validReviews.length === 0) {
      return res.status(422).json({
        success: false,
        error: inputRecords.length === 0 ? 'No review records were found in the uploaded file.' : 'No valid reviews could be imported.',
        job,
        added: 0,
        updated: 0,
        total_in_db: db.getReviews(workspaceId).length,
        errors
      });
    }

    const importResult = db.importReviews(validReviews, job, workspaceId);

    res.json({
      success: true,
      job,
      added: importResult.added,
      updated: importResult.updated,
      total_in_db: importResult.total,
      errors
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Run AI / Deterministic Analysis on unclassified or selected reviews
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { review_ids, force_reanalyze, method } = req.body;
    const workspaceId = getWorkspaceId(req);
    const settings = db.getSettings(workspaceId);
    const useAi = method === 'gemini_ai' || (method !== 'deterministic_rules' && settings.classification_mode === 'gemini_with_fallback');

    let targetReviews = db.getReviews(workspaceId);
    if (Array.isArray(review_ids) && review_ids.length > 0) {
      targetReviews = targetReviews.filter((r) => review_ids.includes(r.review_id));
    } else if (!force_reanalyze) {
      targetReviews = targetReviews.filter(
        (r) => r.issues.length === 0 || r.analysis_method === 'unprocessed'
      );
    }
    // Confirmed duplicates share a review ID with their canonical row and
    // must retain their relationship. Human decisions are never overwritten
    // by a batch AI run.
    targetReviews = targetReviews.filter(
      (r) => !r.duplicate_of && r.analysis_method !== 'manual_override'
    );

    const analyzed: Review[] = [];
    for (const r of targetReviews) {
      const result = await classifyReview(r, useAi);
      r.issues = result.issues;
      r.sentiment = result.sentiment;
      r.needs_human_review = result.needs_human_review;
      r.analysis_method = result.method;
      r.analyzed_at = new Date().toISOString();
      db.saveReview(r, workspaceId);
      analyzed.push(r);
    }

    db.addAuditLog({
      log_id: `AUD-${Date.now()}`,
      event_type: 'ANALYSIS_RUN',
      entity_id: `BATCH-${analyzed.length}`,
      entity_type: 'review',
      timestamp: new Date().toISOString(),
      user: useAi ? 'Gemini AI Assistant' : 'Deterministic Rule Engine',
      details: `Classified ${analyzed.length} reviews using ${useAi ? 'Gemini 3.8 Flash' : 'Deterministic Rules'}`,
      workspace_id: workspaceId
    });

    res.json({
      success: true,
      analyzed_count: analyzed.length,
      reviews: analyzed
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve Duplicate
app.post('/api/reviews/resolve-duplicate', (req: Request, res: Response) => {
  try {
    const { review_id, mark_as_duplicate, user } = req.body;
    if (!review_id) return res.status(400).json({ error: 'review_id is required' });
    const updated = db.resolveDuplicate(review_id, Boolean(mark_as_duplicate), user, getWorkspaceId(req));
    if (!updated) return res.status(404).json({ error: 'Review not found' });
    res.json({ review: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stats & Dashboard Summary
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const uniqueStats = db.getUniqueReviewStats(workspaceId);
    const issues = db.getIssuesSummary(workspaceId);
    const highSeverityIssues = issues.filter(
      (i) => i.severity === 'critical' || i.severity === 'high'
    );
    const actions = db.getActions(workspaceId);
    const pendingActions = actions.filter(
      (a) => a.status === 'Proposed' || a.status === 'Under Review'
    );

    res.json({
      ...uniqueStats,
      issues_detected_count: issues.length,
      high_severity_issues_count: highSeverityIssues.length,
      pending_actions_count: pendingActions.length,
      top_issues: issues.slice(0, 3)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Issues Summary (Top 3 Prominent + Full taxonomy)
app.get('/api/issues', (req: Request, res: Response) => {
  try {
    const issues = db.getIssuesSummary(getWorkspaceId(req));
    res.json({ issues, total: issues.length, top_three: issues.slice(0, 3) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Products Quality Summary
app.get('/api/products', (req: Request, res: Response) => {
  try {
    const products = db.getProductsSummary(getWorkspaceId(req));
    res.json({ products, total: products.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Corrective Actions CRUD
app.get('/api/actions', (req: Request, res: Response) => {
  res.json({ actions: db.getActions(getWorkspaceId(req)) });
});

app.post('/api/actions', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const workspaceId = getWorkspaceId(req);
    if (!body.issue_category || !body.recommended_action) {
      return res.status(400).json({ error: 'issue_category and recommended_action are required' });
    }

    const action: CorrectiveAction = {
      action_id: body.action_id || `ACT-${Date.now().toString().slice(-4)}`,
      issue_category: body.issue_category,
      issue_title: body.issue_title || body.issue_category.replace(/_/g, ' '),
      affected_products: Array.isArray(body.affected_products) ? body.affected_products : [],
      recommended_action: body.recommended_action,
      rationale: body.rationale || 'Corrective action hypothesis based on customer review citations.',
      assigned_team: body.assigned_team || 'Quality Assurance',
      owner_name: body.owner_name || 'Unassigned',
      priority: body.priority || 'P1 - High',
      severity: body.severity || 'high',
      estimated_cost_usd: Number(body.estimated_cost_usd) || 350,
      expected_benefit: body.expected_benefit || 'Decrease return rate and improve customer sentiment.',
      status: body.status || 'Proposed',
      due_date: body.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reviewer_notes: body.reviewer_notes || '',
      supporting_review_ids: Array.isArray(body.supporting_review_ids)
        ? body.supporting_review_ids.filter((id: unknown) => typeof id === 'string' && Boolean(db.getReviewById(id, workspaceId)))
        : []
    };

    const created = db.createAction(action, resLocalsUser(req).name, workspaceId);
    res.status(201).json({ action: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/actions/:id', (req: Request, res: Response) => {
  try {
    const { workspace_id: _workspaceId, user: _user, ...safeUpdates } = req.body;
    const updated = db.updateAction(req.params.id, safeUpdates, resLocalsUser(req).name, getWorkspaceId(req));
    if (!updated) return res.status(404).json({ error: 'Action not found' });
    res.json({ action: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Original vs Final Decisions (Side-by-side history preservation)
app.get('/api/decisions', (req: Request, res: Response) => {
  res.json({ decisions: db.getDecisions(getWorkspaceId(req)) });
});

app.post('/api/decisions', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.decision_id || !body.issue_category) {
      return res.status(400).json({ error: 'decision_id and issue_category are required' });
    }

    const decision: DecisionVersion = {
      decision_id: body.decision_id,
      issue_category: body.issue_category,
      issue_title: body.issue_title || body.issue_category,
      timestamp: new Date().toISOString(),
      created_by: body.created_by || 'Quality Lead',
      original_ranking: body.original_ranking || 1,
      original_scope_product_ids: body.original_scope_product_ids || [],
      original_recommendation: body.original_recommendation || '',
      original_team: body.original_team || 'Quality Assurance',
      original_priority: body.original_priority || 'P1 - High',
      final_scope_product_ids: body.final_scope_product_ids || [],
      final_corrective_action: body.final_corrective_action || '',
      final_team: body.final_team || 'Supplier Management',
      final_priority: body.final_priority || 'P1 - High',
      scope_change_reason: body.scope_change_reason || '',
      evidence_reviewed_count: body.evidence_reviewed_count || 1,
      negotiation_notes: body.negotiation_notes || '',
      status: body.status || 'Agreed',
      version: 1
    };

    const saved = db.saveDecision(decision, resLocalsUser(req).name, getWorkspaceId(req));
    res.status(201).json({ decision: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Logs
app.get('/api/audit-log', (req: Request, res: Response) => {
  res.json({ logs: db.getAuditLogs(getWorkspaceId(req)) });
});

// Load Official C01 Dataset (20 judge-labelled reviews, idempotent, non-destructive)
app.post('/api/dataset/load-c01', (req: Request, res: Response) => {
  try {
    const result = db.loadOfficialC01(getWorkspaceId(req));
    res.json({
      success: true,
      message: 'Official C01 dataset (20 reviews) loaded successfully.',
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Official C01 Fixture Raw Metadata
app.get('/api/dataset/c01-fixture', (req: Request, res: Response) => {
  try {
    const fixturePath = path.resolve(process.cwd(), 'Starter_Data/C01/fixture.json');
    if (fs.existsSync(fixturePath)) {
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      res.json({ fixture });
    } else {
      res.status(404).json({ error: 'C01 fixture file not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Evaluation Lab Benchmark (Calculates Precision, Recall, F1, exact-match, agreed labels against 20 ground truth judge reviews)
app.get('/api/evaluation/benchmark', (req: Request, res: Response) => {
  try {
    const mode = (req.query.mode as string) === 'granular_taxonomy' ? 'granular_taxonomy' : 'c01_official';
    const reviews = db.getQuarantinedReviews();
    const evaluation = runEvaluationBenchmark(reviews, mode);
    res.json({ evaluation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Business Planner Assumptive Model & MBA unit economics
app.get('/api/business-planner', (req: Request, res: Response) => {
  const workspaceId = getWorkspaceId(req);
  res.json({
    assumptions: db.getBusinessAssumptions(workspaceId),
    action_cost_table: db.getActionCostTable()
  });
});

app.post('/api/business-planner', (req: Request, res: Response) => {
  try {
    const updated = db.updateBusinessAssumptions(req.body, getWorkspaceId(req));
    res.json({ assumptions: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Discovery Interviews
app.get('/api/interviews', (req: Request, res: Response) => {
  res.json({ interviews: db.getInterviews(getWorkspaceId(req)) });
});

app.post('/api/interviews', (req: Request, res: Response) => {
  try {
    const saved = db.saveInterview(req.body, getWorkspaceId(req));
    res.status(201).json({ interview: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Pilot Experiments
app.get('/api/pilots', (req: Request, res: Response) => {
  res.json({ pilots: db.getPilots(getWorkspaceId(req)) });
});

app.post('/api/pilots', (req: Request, res: Response) => {
  try {
    const saved = db.savePilot(req.body, getWorkspaceId(req));
    res.status(201).json({ pilot: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', (req: Request, res: Response) => {
  res.json({ settings: db.getSettings(getWorkspaceId(req)) });
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const { workspace_id: _workspaceId, user: _user, ...safeSettings } = req.body;
    const updated = db.updateSettings(safeSettings, resLocalsUser(req).name, getWorkspaceId(req));
    res.json({ settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Demo Data
app.post('/api/reset-demo', (req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Resetting shared demo data is disabled. Use the Evaluation Lab to inspect the quarantined C01 fixture.'
  });
});

// Export CSV & JSON (Formula injection sanitized)
app.get('/api/export/csv', (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const reviews = db.getReviews(workspaceId);
    const headers = [
      'review_id',
      'product_id',
      'product_name',
      'rating',
      'created_at',
      'sentiment',
      'categories',
      'evidence_quotes',
      'highest_severity',
      'analysis_method',
      'duplicate_of'
    ];

    const rows = reviews.map((r) => [
      sanitizeForCsv(r.review_id),
      sanitizeForCsv(r.product_id),
      sanitizeForCsv(r.product_name || ''),
      sanitizeForCsv(r.rating),
      sanitizeForCsv(r.created_at),
      sanitizeForCsv(r.sentiment || 'negative'),
      sanitizeForCsv(r.issues.map((i) => i.category).join('; ')),
      sanitizeForCsv(r.issues.map((i) => i.evidence).join(' | ')),
      sanitizeForCsv(r.issues[0]?.severity || 'medium'),
      sanitizeForCsv(r.analysis_method || 'unprocessed'),
      sanitizeForCsv(r.duplicate_of || '')
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="review_to_action_export_${Date.now()}.csv"`
    );
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/json', (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const payload = {
      exported_at: new Date().toISOString(),
      dataset_version: 'C01-Fixture-v3',
      unique_stats: db.getUniqueReviewStats(workspaceId),
      reviews: db.getReviews(workspaceId),
      top_issues: db.getIssuesSummary(workspaceId).slice(0, 3),
      all_issues: db.getIssuesSummary(workspaceId),
      products: db.getProductsSummary(workspaceId),
      actions: db.getActions(workspaceId),
      decisions: db.getDecisions(workspaceId),
      evaluation: runEvaluationBenchmark(db.getReviews(workspaceId)),
      business_assumptions: db.getBusinessAssumptions(workspaceId)
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="review_to_action_report_${Date.now()}.json"`
    );
    res.send(JSON.stringify(payload, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download Complete Project Zip
app.get('/api/download-zip', (req: Request, res: Response) => {
  const primaryZip = path.resolve(__dirname, 'merchantiq-intelligence-platform.zip');
  const legacyZip = path.resolve(__dirname, 'review-to-action-merchant-copilot.zip');
  const targetZip = fs.existsSync(primaryZip) ? primaryZip : legacyZip;

  if (fs.existsSync(targetZip)) {
    const filename = path.basename(targetZip);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    fs.createReadStream(targetZip).pipe(res);
  } else {
    res.status(404).json({ error: 'Zip archive not found' });
  }
});

// ==========================================
// VITE MIDDLEWARE / STATIC FILES
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Review to Action Merchant Copilot running at http://0.0.0.0:${port}`);
  });
}

startServer();
