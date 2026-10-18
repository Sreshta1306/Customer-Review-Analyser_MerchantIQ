import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merchantiq-regressions-'));
process.env.MERCHANTIQ_DATA_DIR = tempDataDir;

try {
  const [{ Store }, { normalizeImportPayload, normalizeReviewImportRows, parseCsv, parseImportText, validateReviewRecord }, { classifyWithRules, enrichIssuesWithDeterministicRules, getGeminiAnalysisMethod }] =
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

  const normalizedImport = normalizeReviewImportRows([
    { review_id: 'REUSED-ID', review_text: 'invalid first row', rating: 0 },
    {
      review_id: 'REUSED-ID', product_id: 'UNKNOWN-SKU',
      review_text: 'The package arrived late and support never replied.', rating: 1,
      issues: [{ category: 'packaging_problems', evidence: 'fabricated quote', confidence: 1, severity: 'critical' }],
      analysis_method: 'gemini_ai', duplicate_of: 'ATTACKER-CHOSEN'
    },
    { review_id: 'REUSED-ID', product_id: 'UNKNOWN-SKU', review_text: 'A later duplicate row.', rating: 2 }
  ]);
  assert.equal(normalizedImport.validRecords.length, 1, 'an invalid row must not reserve its review ID');
  assert.equal(normalizedImport.validRecords[0].review_id, 'REUSED-ID');
  assert.equal(normalizedImport.validRecords[0].product_id, 'UNKNOWN-SKU', 'unknown product IDs must be preserved');
  assert.equal(normalizedImport.validRecords[0].review_text, 'The package arrived late and support never replied.');
  assert.equal(normalizedImport.errors[0].field, 'rating');
  assert.match(normalizedImport.errors[1].message, /Duplicate review_id/);
  assert.equal(normalizedImport.duplicateCandidates, 1);
  assert.equal('issues' in normalizedImport.validRecords[0], false, 'untrusted client labels must be discarded');
  assert.equal('analysis_method' in normalizedImport.validRecords[0], false, 'untrusted client methods must be discarded');
  const uploadedTextIssues = classifyWithRules(normalizedImport.validRecords[0].review_text, 1).issues;
  assert.deepEqual(uploadedTextIssues.map((issue) => issue.category), ['delivery_related_issues', 'other'],
    'trusted classification must follow the uploaded source text instead of supplied labels');
  const pendingRefund = classifyWithRules('My refund has still not been processed.', 1);
  assert.ok(pendingRefund.issues.some((issue) => issue.category === 'other'), 'refunds that have not been processed must be classified');
  const novelComplaint = classifyWithRules('My replacement has still not arrived after the return was accepted.', 1);
  assert.ok(novelComplaint.issues.some((issue) => issue.category === 'other'),
    'new uploaded return/replacement complaints should influence classification');

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
  assert.deepEqual(
    classifyWithRules('The item is good. The box arrived torn.', 4).issues.map(
      (issue) => issue.category
    ),
    ['packaging_problems']
  );
  assert.deepEqual(
    classifyWithRules('The package arrived damaged, but the product works perfectly.', 4).issues.map(
      (issue) => issue.category
    ),
    ['packaging_problems']
  );
  assert.deepEqual(
    classifyWithRules('Support never replied about the late order.', 1).issues.map(
      (issue) => issue.category
    ),
    ['delivery_related_issues', 'other']
  );
  assert.deepEqual(
    classifyWithRules('The item is good. The box arrived torn.', 5).issues.map((issue) => issue.category),
    ['packaging_problems']
  );
  assert.deepEqual(
    classifyWithRules('The product arrived cracked.', 2).issues.map((issue) => issue.category),
    ['product_damage']
  );
  assert.deepEqual(
    classifyWithRules('The zipper broke and the package arrived late.', 1).issues.map((issue) => issue.category),
    ['manufacturing_defects', 'delivery_related_issues']
  );
  assert.deepEqual(
    classifyWithRules('The shirt is too large and the size guide was wrong.', 2).issues.map((issue) => issue.category),
    ['incorrect_sizing']
  );
  assert.deepEqual(
    classifyWithRules('I received the wrong product.', 1).issues.map((issue) => issue.category),
    ['incorrect_item_delivered']
  );
  assert.deepEqual(
    classifyWithRules('The required adapter is missing.', 1).issues.map((issue) => issue.category),
    ['missing_component']
  );
  assert.deepEqual(
    classifyWithRules("The device doesn't work.", 1).issues.map((issue) => issue.category),
    ['functional_failures']
  );
  assert.deepEqual(
    classifyWithRules('Customer service did not respond to my message.', 1).issues.map((issue) => issue.category),
    ['other']
  );
  assert.deepEqual(
    classifyWithRules('The box is not damaged, the stitching is strong, and the device works perfectly.', 5).issues.map((issue) => issue.category),
    ['uncertain'],
    'Positive and negated category language should not create complaint labels'
  );
  assert.deepEqual(
    classifyWithRules('The size guide was accurate and the zipper stitching is strong.', 5).issues.map((issue) => issue.category),
    ['uncertain'],
    'Positive mentions of size guides and construction should not create complaints'
  );
  assert.deepEqual(
    classifyWithRules('The screen is not cracked and the box was not damaged.', 5).issues.map((issue) => issue.category),
    ['uncertain'],
    'Explicitly negated damage should not create complaints'
  );
  assert.deepEqual(
    new Set(
      classifyWithRules(
        'The product arrived cracked, the wrong item was sent, and a required part is missing.',
        1
      ).issues.map((issue) => issue.category)
    ),
    new Set(['product_damage', 'incorrect_item_delivered', 'missing_component'])
  );
  assert.deepEqual(
    classifyWithRules('The product looks fine and arrived on time.', 5).issues.map(
      (issue) => issue.category
    ),
    ['uncertain']
  );
  assert.deepEqual(
    enrichIssuesWithDeterministicRules(
      'The item is good. The box arrived torn.',
      4,
      [{
        category: 'uncertain',
        evidence: 'The item is good.',
        confidence: 0.4,
        severity: 'uncertain'
      }]
    ).map((issue) => issue.category),
    ['packaging_problems'],
    'Deterministic enrichment should replace an uncertain Gemini result for clear evidence'
  );
  assert.deepEqual(
    enrichIssuesWithDeterministicRules('Support never replied about my late order.', 1, [{
      category: 'uncertain', evidence: 'Support never replied about my late order.', confidence: 0.4, severity: 'uncertain'
    }]).map((issue) => issue.category),
    ['delivery_related_issues', 'other'],
    'Gemini uncertain should be enriched with every supported deterministic issue'
  );
  const uncertainGemini = [{
    category: 'uncertain' as const, evidence: 'The item is good.', confidence: 0.4, severity: 'uncertain' as const
  }];
  const packagingEnrichment = enrichIssuesWithDeterministicRules(
    'The item is good. The box arrived torn.', 4, uncertainGemini
  );
  assert.equal(getGeminiAnalysisMethod(uncertainGemini, packagingEnrichment), 'gemini_ai_enriched',
    'Rule-enriched Gemini classifications must be labeled as mixed method');
  assert.equal(getGeminiAnalysisMethod(packagingEnrichment, packagingEnrichment), 'gemini_ai',
    'Gemini classifications with no rule additions must retain the Gemini label');
  assert.equal(
    classifyWithRules('This product is excellent and works perfectly.', 5).issues[0]?.category,
    'uncertain'
  );

  const rollbackStore = new Store(false);
  rollbackStore.importReviews([{ review_id: 'BASELINE', product_id: 'PERSISTED-PRODUCT', review_text: 'Baseline record.', rating: 3, created_at: new Date().toISOString(), issues: [] }], {
    ...firstJob, job_id: 'JOB-ROLLBACK-BASE', total_rows: 1, valid_rows: 1
  });
  const dbFile = path.join(tempDataDir, 'merchant_intelligence_db.json');
  const persistedBeforeFailure = fs.readFileSync(dbFile, 'utf8');
  const previousSave = (rollbackStore as any).save.bind(rollbackStore);
  (rollbackStore as any).save = () => { throw new Error('simulated persistence failure'); };
  assert.throws(() => rollbackStore.importReviews([{ review_id: 'SHOULD-ROLL-BACK', product_id: 'P1', review_text: 'The zipper broke.', rating: 1, created_at: new Date().toISOString(), issues: [] }], {
    ...firstJob, job_id: 'JOB-ROLLBACK-FAIL', total_rows: 1, valid_rows: 1
  }), /simulated persistence failure/);
  (rollbackStore as any).save = previousSave;
  assert.equal(rollbackStore.getReviewById('SHOULD-ROLL-BACK'), undefined, 'failed import must roll back in-memory reviews');
  assert.equal((rollbackStore as any).data.importJobs.some((job: { job_id: string }) => job.job_id === 'JOB-ROLLBACK-FAIL'), false,
    'failed import must roll back import job metadata');
  assert.equal(fs.readFileSync(dbFile, 'utf8'), persistedBeforeFailure, 'failed import must leave persisted bytes unchanged');

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
  const persistedCountsBeforeRepeat = workspaceStore.getUniqueReviewStats('WS-REGRESSION');
  for (const review of workspaceStore.getReviews('WS-REGRESSION')) {
    const result = classifyWithRules(review.review_text, review.rating);
    review.issues = result.issues;
    review.analysis_method = 'deterministic_rules';
    workspaceStore.saveReview(review, 'WS-REGRESSION');
  }
  const persistedCountsAfterRepeat = workspaceStore.getUniqueReviewStats('WS-REGRESSION');
  assert.deepEqual(persistedCountsAfterRepeat, persistedCountsBeforeRepeat, 'Reanalysis must not alter raw, unique, or duplicate review counts');
  assert.equal(workspaceStore.getReviews('WS-REGRESSION').length, persistedCountsBeforeRepeat.total_imported_records, 'Repeated analysis must preserve all raw review records');

  // A canonical review and confirmed duplicate can share the same ID. Saving
  // the canonical record must update that object and leave its duplicate intact.
  const sameIdStore = new Store(false);
  const sharedReview: import('../src/types').Review = {
    review_id: 'SHARED-ID', workspace_id: 'WS-SHARED', product_id: 'P1',
    review_text: 'The box arrived torn.', rating: 2, created_at: new Date().toISOString(),
    issues: [], analysis_method: 'unprocessed' as const
  };
  const sharedDuplicate = {
    ...sharedReview, duplicate_of: 'SHARED-ID',
    issues: [{ category: 'uncertain' as const, evidence: 'The box', confidence: 0.3, severity: 'uncertain' as const }]
  };
  (sameIdStore as any).data.reviews.push(sharedDuplicate, sharedReview);
  sharedReview.issues = classifyWithRules(sharedReview.review_text, sharedReview.rating).issues;
  sharedReview.analysis_method = 'deterministic_rules';
  sameIdStore.saveReview(sharedReview, 'WS-SHARED');
  assert.deepEqual(sameIdStore.getReviews('WS-SHARED')[0].issues, sharedDuplicate.issues,
    'Saving the canonical row must not overwrite a same-ID confirmed duplicate');
  assert.deepEqual(sameIdStore.getReviews('WS-SHARED')[1].issues, sharedReview.issues,
    'Saving a review reference must persist that exact canonical row');
  assert.equal(sameIdStore.getUniqueReviewStats('WS-SHARED').total_imported_records, 2);

  const assumptionsStore = new Store(false);
  assumptionsStore.updateBusinessAssumptions({ monthly_subscription_usd: 123 }, 'WS-ASSUMPTIONS-A');
  assert.equal(assumptionsStore.getBusinessAssumptions('WS-ASSUMPTIONS-A').monthly_subscription_usd, 123);
  assert.notEqual(assumptionsStore.getBusinessAssumptions('WS-ASSUMPTIONS-B').monthly_subscription_usd, 123,
    'Workspace business assumptions must remain isolated');
  assert.deepEqual(
    classifyWithRules('The kettle stopped working after two uses.', 1).issues.map((issue) => issue.category),
    ['functional_failures'],
    'deterministic fallback should classify stopped-working complaints'
  );
  console.log('Regression checks passed: 20 fixture records, 19 unique, 1 confirmed duplicate.');
} finally {
  fs.rmSync(tempDataDir, { recursive: true, force: true });
}
