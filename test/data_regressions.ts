import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merchantiq-regressions-'));
process.env.MERCHANTIQ_DATA_DIR = tempDataDir;

try {
  const [{ Store }, { normalizeImportPayload, parseCsv, parseImportText, validateReviewRecord }, { classifyWithRules }] =
    await Promise.all([
      import('../src/server/db.ts'),
      import('../src/import/parsing.ts'),
      import('../src/server/classifier.ts')
    ]);

  const fixture = JSON.parse(
    fs.readFileSync(path.resolve('Starter_Data/C01/fixture.json'), 'utf8')
  );
  const records = normalizeImportPayload(fixture);
  assert.equal(records.length, 20, 'C01 fixture should normalize to 20 records');

  const store = new Store(false);
  const reviews = records.map((record) => {
    const result = classifyWithRules(String(record.review_text), Number(record.rating));
    return {
      review_id: String(record.review_id),
      product_id: String(record.product_id),
      review_text: String(record.review_text),
      rating: Number(record.rating),
      created_at: String(record.created_at),
      issues: result.issues,
      sentiment: result.sentiment,
      needs_human_review: result.needs_human_review,
      analysis_method: 'deterministic_rules' as const
    };
  });

  const firstJob = {
    job_id: 'JOB-REGRESSION-1',
    filename: 'fixture.json',
    imported_at: new Date().toISOString(),
    total_rows: reviews.length,
    valid_rows: reviews.length,
    invalid_rows: 0,
    duplicate_candidates: 0,
    status: 'completed' as const,
    errors: []
  };

  const firstImport = store.importReviews(reviews, firstJob);
  assert.equal(firstImport.added, 20);
  assert.equal(store.getUniqueReviewStats().total_imported_records, 20);
  assert.equal(store.getUniqueReviewStats().valid_unique_reviews, 19);
  assert.equal(store.getUniqueReviewStats().confirmed_duplicates, 1);
  assert.equal(store.getReviewById('R005')?.duplicate_of, 'R004');
  assert.equal(firstJob.duplicate_candidates, 1);
  const firstStats = store.getUniqueReviewStats();
  const firstReviews = store.getReviews();
  assert.equal(
    firstReviews.filter((review) => review.duplicate_of).length,
    firstStats.confirmed_duplicates,
    'Dashboard confirmed duplicate metric must match review metadata'
  );
  assert.equal(
    firstReviews.filter((review) => review.is_duplicate_candidate && !review.duplicate_of).length,
    firstStats.suspected_duplicates,
    'Explorer suspected duplicate metadata must match dashboard statistics'
  );

  for (const review of store.getReviews()) {
    review.analyzed_at = new Date().toISOString();
    review.analysis_method = 'deterministic_rules';
    store.saveReview(review);
  }
  for (const review of store.getReviews()) {
    review.analyzed_at = new Date().toISOString();
    store.saveReview(review);
  }
  assert.equal(store.getReviews().length, 20, 'Repeated analysis must not insert reviews');

  const secondImport = store.importReviews(reviews, {
    ...firstJob,
    job_id: 'JOB-REGRESSION-2'
  });
  assert.equal(secondImport.added, 0);
  assert.equal(secondImport.updated, 20);
  assert.equal(store.getReviews().length, 20, 'Repeated imports must reconcile by review ID');
  assert.equal(store.getUniqueReviewStats().confirmed_duplicates, 1);
  assert.equal(
    store.getIssuesSummary().some((issue) => issue.review_ids.includes('R005')),
    false,
    'Confirmed duplicates must not inflate issue counts'
  );

  const similarDifferentProduct = [
    {
      review_id: 'CUSTOM-1',
      product_id: 'PRODUCT-A',
      review_text: 'The zipper broke on first wear.',
      rating: 1,
      created_at: new Date().toISOString(),
      issues: []
    },
    {
      review_id: 'CUSTOM-2',
      product_id: 'PRODUCT-B',
      review_text: 'The zipper broke on first wear.',
      rating: 1,
      created_at: new Date().toISOString(),
      issues: []
    }
  ];
  store.importReviews(similarDifferentProduct, {
    ...firstJob,
    job_id: 'JOB-REGRESSION-3',
    total_rows: 2,
    valid_rows: 2
  });
  assert.equal(store.getReviewById('CUSTOM-2')?.duplicate_of, undefined);
  assert.equal(store.getReviewById('CUSTOM-2')?.is_duplicate_candidate, true);

  assert.equal(parseImportText('{not-json').rejectedRows[0].message, 'Invalid JSON');
  assert.equal(parseImportText('review_id,review_text\nR1,"unterminated').rejectedRows[0].message, 'Unclosed quoted field');
  assert.equal(validateReviewRecord({ review_text: 'missing ID', rating: 1 })?.field, 'review_id');
  assert.equal(validateReviewRecord({ review_id: 'missing-text', rating: 1 })?.field, 'review_text');
  assert.equal(validateReviewRecord({ review_id: 'bad-rating', review_text: 'bad', rating: 6 })?.field, 'rating');
  assert.equal(validateReviewRecord({ review_id: 'valid', review_text: 'valid', rating: 2 }), null);
  assert.equal(
    parseCsv('review_id,product_id,review_text\nR1,P1,"one, two"').records[0].review_text,
    'one, two'
  );
  assert.deepEqual(
    classifyWithRules('The shoes arrived damaged and the size is too small.', 1).issues.map(
      (issue) => issue.category
    ),
    ['product_damage', 'incorrect_sizing']
  );
  assert.deepEqual(
    classifyWithRules('Arrived three days late but looks fine.', 3).issues.map(
      (issue) => issue.category
    ),
    ['delivery_related_issues']
  );
  assert.deepEqual(
    classifyWithRules('The package arrived late.', 2).issues.map(
      (issue) => issue.category
    ),
    ['delivery_related_issues']
  );
  assert.equal(
    classifyWithRules('The product looks fine and arrived on time.', 5).issues.some(
      (issue) => issue.category === 'delivery_related_issues'
    ),
    false
  );
  assert.deepEqual(
    classifyWithRules('The zipper broke and delivery was late.', 1).issues.map(
      (issue) => issue.category
    ),
    ['manufacturing_defects', 'delivery_related_issues']
  );
  assert.equal(
    classifyWithRules('This product is excellent and works perfectly.', 5).issues[0]?.category,
    'uncertain'
  );

  const persistedStore = new Store(false);
  persistedStore.importReviews(
    [
      {
        review_id: 'PERSISTED-1',
        product_id: 'PERSISTED-PRODUCT',
        review_text: 'A unique complaint about a broken handle.',
        rating: 1,
        created_at: new Date().toISOString(),
        issues: []
      }
    ],
    {
      ...firstJob,
      job_id: 'JOB-REGRESSION-4',
      total_rows: 1,
      valid_rows: 1
    }
  );
  const restartedStore = new Store();
  assert.ok(restartedStore.getReviewById('PERSISTED-1'));

  const workspaceStore = new Store(false);
  const workspaceFirst = workspaceStore.loadOfficialC01('WS-REGRESSION');
  const workspaceSecond = workspaceStore.loadOfficialC01('WS-REGRESSION');
  assert.equal(workspaceFirst.total, 20);
  assert.equal(workspaceFirst.unique_valid, 19);
  assert.equal(workspaceSecond.added, 0);
  assert.equal(workspaceSecond.updated, 20);
  assert.equal(workspaceStore.getReviews('WS-REGRESSION').length, 20);
  const uniqueReview = {
    review_id: 'UNIQUE-COMPLAINT',
    product_id: 'UNIQUE-PRODUCT',
    review_text: 'The thermostat does not regulate heat and shuts off completely.',
    rating: 1,
    created_at: new Date().toISOString(),
    issues: classifyWithRules('The thermostat does not regulate heat and shuts off completely.', 1).issues
  };
  workspaceStore.importReviews([uniqueReview], {
    ...firstJob,
    job_id: 'JOB-REGRESSION-5',
    total_rows: 1,
    valid_rows: 1
  });
  assert.ok(
    workspaceStore.getReviewById('UNIQUE-COMPLAINT')?.issues.some(
      (issue) => issue.category === 'functional_failures'
    )
  );
  const beforeReanalysisStats = workspaceStore.getUniqueReviewStats();
  const delayedReview = workspaceStore.getReviewById('R002', 'WS-REGRESSION');
  assert.ok(delayedReview);
  const delayedClassification = classifyWithRules(delayedReview!.review_text, delayedReview!.rating);
  delayedReview!.issues = delayedClassification.issues;
  delayedReview!.analysis_method = 'deterministic_rules';
  workspaceStore.saveReview(delayedReview!);
  const afterReanalysisStats = workspaceStore.getUniqueReviewStats();
  assert.deepEqual(afterReanalysisStats, beforeReanalysisStats);
  console.log('Regression checks passed: 20 fixture records, 19 unique, 1 confirmed duplicate.');
} finally {
  fs.rmSync(tempDataDir, { recursive: true, force: true });
}
