import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merchantiq-api-workflow-'));
const databasePath = path.join(dataDir, 'merchant_intelligence_db.json');
const fixture = JSON.parse(fs.readFileSync(path.resolve('Starter_Data/C01/fixture.json'), 'utf8'));
let server: ChildProcess | undefined;
let port = 0;

async function unusedPort(): Promise<number> {
  const listener = net.createServer();
  await new Promise<void>((resolve, reject) => listener.listen(0, '127.0.0.1', resolve).once('error', reject));
  const address = listener.address();
  assert.ok(address && typeof address === 'object');
  const chosenPort = address.port;
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return chosenPort;
}

async function startServer(): Promise<void> {
  port = await unusedPort();
  server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MERCHANTIQ_DATA_DIR: dataDir,
      PORT: String(port),
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false',
      GEMINI_API_KEY: '',
      GOOGLE_CLIENT_ID: ''
    },
    stdio: 'ignore'
  });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`API test server exited early with code ${server.exitCode}`);
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API test server did not become healthy within 10 seconds.');
}

async function stopServer(): Promise<void> {
  if (!server || server.exitCode !== null) return;
  const child = server;
  child.kill();
  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    setTimeout(resolve, 3000).unref();
  });
  server = undefined;
}

function endpoint(route: string): string {
  return `http://127.0.0.1:${port}${route}`;
}

async function register(email: string): Promise<{ email: string; user: { workspace_id: string } }> {
  const response = await fetch(endpoint('/api/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'API Test User', email, store_name: 'Test Store', password: 'StrongPass123' })
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('set-cookie'), null, 'registration must not create an authenticated session');
  const body = await response.json() as { user: { workspace_id: string } };
  return { email, user: body.user };
}

async function login(email: string): Promise<string> {
  const response = await fetch(endpoint('/api/auth/login'), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'StrongPass123' })
  });
  assert.equal(response.status, 200, 'valid credentials must be accepted');
  const cookieHeader = response.headers.get('set-cookie') || '';
  assert.match(cookieHeader, /HttpOnly/i);
  assert.match(cookieHeader, /Max-Age=604800/);
  return cookieHeader.split(';')[0];
}

async function request(route: string, cookie: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('cookie', cookie);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return fetch(endpoint(route), { ...init, headers });
}

try {
  await startServer();
  const healthResponse = await fetch(endpoint('/api/health'));
  const health = await healthResponse.json() as { status: string; ai_available: boolean };
  assert.equal(health.status, 'ok');
  assert.equal(health.ai_available, false, 'this isolated workflow must run with Gemini disabled');
  assert.equal((await fetch(endpoint('/api/stats'))).status, 401, 'protected endpoints must reject anonymous requests');

  const first = await register('first@example.test');
  assert.equal((await fetch(endpoint('/api/auth/me')).then((response) => response.status)), 401,
    'a newly registered user must remain signed out');
  assert.equal((await fetch(endpoint('/api/stats')).then((response) => response.status)), 401,
    'protected dashboard APIs must reject a user before login');
  const badLogin = await fetch(endpoint('/api/auth/login'), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'first@example.test', password: 'wrong-password' })
  });
  assert.equal(badLogin.status, 401, 'invalid passwords must be rejected');
  const firstCookie = await login('first@example.test');

  const emptyStats = await request('/api/stats', firstCookie);
  assert.equal(emptyStats.status, 200);
  const initialStats = await emptyStats.json() as { total_imported_records: number; valid_unique_reviews: number; issues_detected_count: number };
  assert.equal(initialStats.total_imported_records, 0, 'a new workspace must start with zero uploaded reviews');
  assert.equal(initialStats.valid_unique_reviews, 0);
  assert.equal(initialStats.issues_detected_count, 0, 'a new workspace must start with zero issue groups');
  const initialProducts = await request('/api/products', firstCookie).then((response) => response.json()) as { products: unknown[] };
  assert.equal(initialProducts.products.length, 0, 'a new workspace must start with zero product insights');
  assert.equal((await request('/api/reviews', firstCookie).then((response) => response.json()) as { reviews: unknown[] }).reviews.length, 0);

  const implicitBenchmark = await request('/api/evaluation/benchmark', firstCookie);
  assert.equal(implicitBenchmark.status, 400, 'benchmark results require explicit fixture selection');
  const explicitBenchmark = await request('/api/evaluation/benchmark?dataset=c01_official&mode=c01_official', firstCookie);
  assert.equal(explicitBenchmark.status, 200);
  const benchmarkResult = await explicitBenchmark.json() as { dataset: { id: string; analysis_method: string }; evaluation: { total_samples: number } };
  assert.equal(benchmarkResult.dataset.id, 'c01_official');
  assert.equal(benchmarkResult.dataset.analysis_method, 'deterministic_rules');
  assert.equal(benchmarkResult.evaluation.total_samples, 20);
  const disabledFixtureImport = await request('/api/dataset/load-c01', firstCookie, { method: 'POST', body: JSON.stringify({}) });
  assert.equal(disabledFixtureImport.status, 410, 'the benchmark fixture must not be imported as customer reviews');
  const stillEmpty = await request('/api/stats', firstCookie).then((response) => response.json()) as { total_imported_records: number };
  assert.equal(stillEmpty.total_imported_records, 0, 'benchmark evaluation must not mutate workspace data');

  const c01Response = await request('/api/reviews/import', firstCookie, {
    method: 'POST', body: JSON.stringify({ filename: 'C01-fixture.json', records: fixture, auto_analyze: true })
  });
  assert.equal(c01Response.status, 200);
  const c01Result = await c01Response.json() as { added: number; total_in_db: number };
  assert.equal(c01Result.added, 20, 'the supplied C01 fixture records must be persisted');
  assert.equal(c01Result.total_in_db, 20);

  const importResponse = await request('/api/reviews/import', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ filename: 'new-complaints.json', auto_analyze: true, records: [
      { review_id: 'UPLOAD-REUSED', review_text: 'invalid first row', rating: 0 },
      {
        review_id: 'UPLOAD-REUSED', product_id: 'UNKNOWN-SKU',
        review_text: 'The shoes arrived damaged and the size is too small.', rating: 1,
        issues: [{ category: 'functional_failures', evidence: 'forged evidence', confidence: 1, severity: 'critical' }],
        analysis_method: 'gemini_ai', duplicate_of: 'R001'
      },
      { review_id: 'UPLOAD-REUSED', product_id: 'UNKNOWN-SKU', review_text: 'A duplicate ID row.', rating: 2 },
      { review_id: 'UPLOAD-REFUND-001', product_id: 'PROD-UNKNOWN',
        review_text: 'My refund has still not been processed.', rating: 1,
        issues: [{ category: 'packaging_problems', evidence: 'fabricated', confidence: 1, severity: 'critical' }],
        analysis_method: 'unprocessed' }
    ] })
  });
  assert.equal(importResponse.status, 200);
  const importResult = await importResponse.json() as { added: number; total_in_db: number; errors: { row: number; field: string }[] };
  assert.equal(importResult.added, 2);
  assert.equal(importResult.total_in_db, 22);
  assert.equal(importResult.errors.length, 2);
  assert.equal(importResult.errors[0].field, 'rating');
  assert.equal(importResult.errors[1].field, 'review_id');

  const allReviewsResponse = await request('/api/reviews?include_duplicates=true', firstCookie);
  assert.equal(allReviewsResponse.status, 200);
  const allReviews = (await allReviewsResponse.json() as { reviews: any[] }).reviews;
  const uploaded = allReviews.find((review) => review.review_id === 'UPLOAD-REUSED');
  assert.ok(uploaded);
  assert.equal(uploaded.product_id, 'UNKNOWN-SKU');
  assert.equal(uploaded.analysis_method, 'deterministic_rules');
  assert.deepEqual(new Set(uploaded.issues.map((issue: { category: string }) => issue.category)),
    new Set(['product_damage', 'incorrect_sizing']), 'actual uploaded text must override forged labels and detect multiple issues');
  assert.equal(uploaded.issues.some((issue: { evidence: string }) => issue.evidence.includes('forged')), false);
  const refund = allReviews.find((review) => review.review_id === 'UPLOAD-REFUND-001');
  assert.ok(refund?.issues.some((issue: { category: string }) => issue.category === 'other'),
    'a new complaint must change stored issue analysis');
  assert.equal(refund.product_id, 'PROD-UNKNOWN');
  const c01Duplicate = allReviews.find((review) => review.review_id === 'R005');
  assert.equal(c01Duplicate?.duplicate_of, 'R004', 'C01 duplicate handling must be retained');

  const issuesResponse = await request('/api/issues', firstCookie);
  const issues = (await issuesResponse.json() as { issues: { category: string; review_ids: string[] }[] }).issues;
  assert.ok(issues.some((issue) => issue.review_ids.includes('UPLOAD-REFUND-001')),
    'uploaded review text must feed the issue aggregation API');
  const productsResponse = await request('/api/products', firstCookie);
  const products = (await productsResponse.json() as { products: { product_id: string; total_unique_reviews: number }[] }).products;
  assert.ok(products.some((product) => product.product_id === 'UNKNOWN-SKU' && product.total_unique_reviews === 1));

  const emptyImport = await request('/api/reviews/import', firstCookie, { method: 'POST', body: JSON.stringify({ records: [], auto_analyze: true }) });
  assert.equal(emptyImport.status, 422, 'empty imports should return a validation error');
  const malformedShape = await request('/api/reviews/import', firstCookie, { method: 'POST', body: JSON.stringify({ records: { unexpected: [] } }) });
  assert.equal(malformedShape.status, 400, 'malformed dataset shapes should be rejected');

  const second = await register('second@example.test');
  const secondCookie = await login(second.email);
  const isolatedReviews = await request('/api/reviews', secondCookie);
  const secondWorkspaceReviews = (await isolatedReviews.json() as { reviews: any[] }).reviews;
  assert.equal(secondWorkspaceReviews.length, 0, 'a second merchant must not see the first merchant reviews');

  const fiveReviewImport = await request('/api/reviews/import', secondCookie, {
    method: 'POST',
    body: JSON.stringify({ filename: 'five-real-reviews.json', auto_analyze: true, records: [
      { review_id: 'FIVE-01', product_id: 'INVALID', review_text: 'invalid row must not reserve this ID', rating: 0 },
      { review_id: 'FIVE-01', product_id: 'UNKNOWN-SKU', review_text: 'The blender pitcher arrived cracked and the motor stopped working after two days.', rating: 1 },
      { review_id: 'FIVE-02', product_id: 'UNKNOWN-SKU', review_text: 'My refund has still not been processed.', rating: 1 },
      { review_id: 'FIVE-03', product_id: 'UNKNOWN-SKU', review_text: 'The delivery was three days late.', rating: 2 },
      { review_id: 'FIVE-04', product_id: 'UNKNOWN-SKU', review_text: 'The package was crushed and torn.', rating: 1 },
      { review_id: 'FIVE-05', product_id: 'UNKNOWN-SKU', review_text: 'Customer support never replied to my emails.', rating: 1 },
      { review_id: 'FIVE-05', product_id: 'UNKNOWN-SKU', review_text: 'A distinct second record with a duplicate ID.', rating: 4 }
    ] })
  });
  assert.equal(fiveReviewImport.status, 200);
  const fiveResult = await fiveReviewImport.json() as { added: number; total_in_db: number; errors: { row: number; field: string }[] };
  assert.equal(fiveResult.added, 5, 'exactly five valid unique rows should be accepted');
  assert.equal(fiveResult.total_in_db, 5);
  assert.equal(fiveResult.errors.length, 2, 'invalid and duplicate rows should both be reported');
  assert.ok(fiveResult.errors.some((error) => error.field === 'rating'));
  assert.ok(fiveResult.errors.some((error) => error.field === 'review_id'));

  const secondReviews = await request('/api/reviews?include_duplicates=true', secondCookie).then((response) => response.json()) as { reviews: any[] };
  assert.equal(secondReviews.reviews.length, 5);
  assert.equal(secondReviews.reviews.find((review) => review.review_id === 'FIVE-01')?.analysis_method, 'deterministic_rules');
  const multiIssue = secondReviews.reviews.find((review) => review.review_id === 'FIVE-01');
  assert.ok(multiIssue?.issues.some((issue: { category: string }) => issue.category === 'product_damage'));
  assert.ok(multiIssue?.issues.some((issue: { category: string }) => issue.category === 'functional_failures'));
  assert.ok(secondReviews.reviews.some((review) => review.review_id === 'FIVE-02' && review.issues.some((issue: { category: string }) => issue.category === 'other')));
  assert.ok(secondReviews.reviews.some((review) => review.review_id === 'FIVE-04' && review.issues.some((issue: { category: string }) => issue.category === 'packaging_problems')));
  const secondIssues = await request('/api/issues', secondCookie).then((response) => response.json()) as { issues: { category: string; unique_review_count: number }[] };
  assert.ok(secondIssues.issues.some((issue) => issue.category === 'product_damage' && issue.unique_review_count === 1));
  assert.ok(secondIssues.issues.some((issue) => issue.category === 'functional_failures' && issue.unique_review_count === 1));
  const secondProducts = await request('/api/products', secondCookie).then((response) => response.json()) as { products: { product_id: string; total_unique_reviews: number }[] };
  assert.ok(secondProducts.products.some((product) => product.product_id === 'UNKNOWN-SKU' && product.total_unique_reviews === 5));
  assert.equal((await request('/api/reviews', firstCookie).then((response) => response.json()) as { reviews: any[] }).reviews.some((review) => review.review_id === 'FIVE-01'), false,
    'the first merchant must not see the second merchant upload');

  await stopServer();
  const persistedBeforeRestart = fs.readFileSync(databasePath, 'utf8');
  JSON.parse(persistedBeforeRestart);
  const hashBeforeRestart = crypto.createHash('sha256').update(persistedBeforeRestart).digest('hex');
  await startServer();
  const afterRestart = await request('/api/reviews?include_duplicates=true', firstCookie);
  assert.equal(afterRestart.status, 200, 'the persisted session and reviews should survive restart');
  const restartedReviews = (await afterRestart.json() as { reviews: any[] }).reviews;
  assert.ok(restartedReviews.some((review) => review.review_id === 'UPLOAD-REFUND-001'));
  const secondAfterRestart = await request('/api/reviews?include_duplicates=true', secondCookie);
  assert.equal(secondAfterRestart.status, 200);
  const persistedSecondReviews = await secondAfterRestart.json() as { reviews: any[] };
  assert.equal(persistedSecondReviews.reviews.length, 5, 'the second workspace upload must survive restart');
  const persistedAfterRestart = fs.readFileSync(databasePath, 'utf8');
  JSON.parse(persistedAfterRestart);
  assert.equal(crypto.createHash('sha256').update(persistedAfterRestart).digest('hex'), hashBeforeRestart,
    'loading the valid JSON database on restart must not rewrite it');

  const logout = await request('/api/auth/logout', firstCookie, { method: 'POST', body: JSON.stringify({}) });
  assert.equal(logout.status, 200);
  assert.equal((await request('/api/stats', firstCookie)).status, 401, 'logout must invalidate the session');
  console.log('Isolated API workflow passed: empty workspaces, opt-in fixture benchmark, real five-review import, validation, trusted multi-issue analysis, issue/product aggregation, workspace isolation, persistence/restart, and logout.');
} finally {
  await stopServer();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
