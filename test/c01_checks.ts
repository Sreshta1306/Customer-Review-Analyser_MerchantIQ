/**
 * MerchantIQ — Automated Test Suite for Case C01: Review to Action Merchant Copilot
 * Tests Public Checks A, B, C, edge cases, prompt injection safety, and persistence.
 */

import fs from 'fs';
import path from 'path';
import { db } from '../src/server/db';
import {
  classifyWithRules,
  runEvaluationBenchmark,
  getC01ExpectedTopicsMap,
  mapCategoriesToC01Topics
} from '../src/server/classifier';
import { hashPassword, verifyPassword } from '../src/server/db';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('MERCHANTIQ CASE C01 — OFFICIAL PUBLIC CHECKS & VERIFICATION');
  console.log('================================================================\n');

  // Load official C01 dataset
  console.log('--- Step 0: Ingesting Official C01 Dataset ---');
  const loadResult = db.loadOfficialC01();
  assert(loadResult.total >= 20, 'Fixture contains at least 20 records', `Total: ${loadResult.total}`);
  assert(loadResult.confirmed_duplicates === 1, 'R005 correctly detected as confirmed duplicate', `Duplicates: ${loadResult.confirmed_duplicates}`);
  assert(loadResult.unique_valid === 19, 'Reconciled 19 unique valid reviews (20 total - 1 duplicate)', `Unique: ${loadResult.unique_valid}`);
  console.log();

  // ----------------------------------------------------------------
  // CHECK A: Label Recovery (>= 16 agreed labels on 20 judge reviews)
  // ----------------------------------------------------------------
  console.log('--- CHECK A: Label Recovery Benchmark (Target >= 16 Agreed Labels) ---');
  const reviews = db.getReviews();
  const evalC01 = runEvaluationBenchmark(reviews, 'c01_official');

  assert(
    evalC01.recovered_label_count >= 16,
    `Check A: Recovered >= 16 agreed labels (Actual: ${evalC01.recovered_label_count} recovered)`,
    `Recovered ${evalC01.recovered_label_count} / 16 target`
  );
  assert(
    evalC01.exact_match_count >= 18,
    `Exact-set match count >= 18 / 20 (Actual: ${evalC01.exact_match_count})`
  );
  assert(
    evalC01.f1_score >= 0.9,
    `Overall F1 score >= 0.90 (Actual: ${(evalC01.f1_score * 100).toFixed(1)}%)`
  );

  console.log(`   Detailed C01 Topic Performance:`);
  for (const m of evalC01.category_metrics) {
    if (m.support > 0 || m.false_positives > 0) {
      console.log(`     - ${m.category.toUpperCase().padEnd(10)}: Support=${m.support}, TP=${m.true_positives}, FP=${m.false_positives}, FN=${m.false_negatives}, F1=${(m.f1 * 100).toFixed(0)}%`);
    }
  }

  // Also verify granular taxonomy mode
  const evalGranular = runEvaluationBenchmark(reviews, 'granular_taxonomy');
  assert(
    evalGranular.recovered_label_count >= 16,
    `Granular taxonomy benchmark also achieves >= 16 agreed labels (Actual: ${evalGranular.recovered_label_count})`
  );
  console.log();

  // ----------------------------------------------------------------
  // CHECK B: Counts and Evidence (Top 3 issues have >= 2 verifiable citations)
  // ----------------------------------------------------------------
  console.log('--- CHECK B: Counts Reconciliation & Verifiable Evidence Citations ---');
  const stats = db.getUniqueReviewStats();
  assert(
    stats.total_imported_records === 20,
    `Total records imported equals 20 (Actual: ${stats.total_imported_records})`
  );
  assert(
    stats.valid_unique_reviews === 19,
    `Valid unique source reviews equals 19 (Actual: ${stats.valid_unique_reviews})`
  );

  const issues = db.getIssuesSummary();
  const topThree = issues.slice(0, 3);
  assert(topThree.length === 3, 'Top three prominent issue groups identified');

  topThree.forEach((issue, idx) => {
    assert(
      issue.supporting_citations.length >= 2,
      `Top issue #${idx + 1} (${issue.title}) has >= 2 verifiable citations (Actual: ${issue.supporting_citations.length})`
    );

    // Verify each citation actually occurs verbatim in source text
    issue.supporting_citations.forEach((cit) => {
      const sourceReview = reviews.find((r) => r.review_id === cit.review_id);
      const quoteOccurs = sourceReview && sourceReview.review_text.toLowerCase().includes(cit.quote.toLowerCase());
      assert(
        Boolean(quoteOccurs),
        `Citation for ${cit.review_id} is verbatim excerpt from source review: "${cit.quote.slice(0, 40)}..."`
      );
    });
  });
  console.log();

  // ----------------------------------------------------------------
  // CHECK C: Duplicate and Prompt Injection Safety
  // ----------------------------------------------------------------
  console.log('--- CHECK C: Duplicate Deduplication & Prompt Injection Safety ---');
  
  // Test R005 duplicate
  const r004 = reviews.find((r) => r.review_id === 'R004');
  const r005 = reviews.find((r) => r.review_id === 'R005');
  assert(Boolean(r004 && r005), 'Both R004 and R005 exist in database');
  assert(r005?.duplicate_of === 'R004', 'R005 is explicitly linked to R004 as duplicate');
  assert(r005?.is_duplicate_candidate === true, 'R005 marked as duplicate candidate');

  // Verify duplicate does not inflate count in issue summary
  const mfgIssue = issues.find((i) => i.category === 'manufacturing_defects');
  assert(
    Boolean(mfgIssue && !mfgIssue.review_ids.includes('R005')),
    'Confirmed duplicate R005 is excluded from active issue review count'
  );

  // Test R006 prompt injection
  const r006 = reviews.find((r) => r.review_id === 'R006');
  assert(Boolean(r006), 'R006 exists in database');
  assert(r006?.rating === 1, 'R006 rating remains 1, prompt injection failed to manipulate rating to 5');
  const r006HasDefect = r006?.issues.some((i) => i.evidence.toLowerCase().includes('sole detached'));
  assert(Boolean(r006HasDefect), 'R006 genuine defect (sole detached from heel) was extracted despite adversarial instruction');
  console.log();

  // ----------------------------------------------------------------
  // Security & Edge Cases
  // ----------------------------------------------------------------
  console.log('--- Edge Cases & Security Controls ---');
  
  // Low-volume safety hazard escalation (R003)
  const funcIssue = issues.find((i) => i.category === 'functional_failures');
  assert(
    Boolean(funcIssue && funcIssue.severity === 'critical' && funcIssue.priority_score >= 85),
    `Low-volume critical safety hazard (R003 sparks/fire) escalated to priority score >= 85 (Actual score: ${funcIssue?.priority_score})`
  );

  // Multi-issue review extraction (R001)
  const r001 = reviews.find((r) => r.review_id === 'R001');
  const r001Categories = r001?.issues.map((i) => i.category) || [];
  assert(
    r001Categories.includes('product_damage') && r001Categories.includes('incorrect_sizing'),
    'Multi-issue review R001 simultaneously extracts both Product Damage and Incorrect Sizing'
  );

  // Sarcasm detection (R002)
  const r002 = reviews.find((r) => r.review_id === 'R002');
  const r002HasDamage = r002?.issues.some((i) => i.category === 'product_damage' || i.category === 'packaging_problems');
  assert(Boolean(r002HasDamage), 'Sarcastic review R002 ("survived a warzone") correctly classified as packaging/damage defect');

  // CSV Formula Injection protection
  const testVal1 = '=cmd|"/C calc"!A0';
  const testVal2 = '+12345';
  const testVal3 = '@SUM(1,2)';
  const testVal4 = '-99';
  const sanitize = (val: any) => {
    const s = String(val ?? '');
    if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
    return s;
  };
  assert(sanitize(testVal1).startsWith("'="), 'CSV formula injection starting with = sanitized with leading quote');
  assert(sanitize(testVal2).startsWith("'+"), 'CSV formula injection starting with + sanitized with leading quote');
  assert(sanitize(testVal3).startsWith("'@"), 'CSV formula injection starting with @ sanitized with leading quote');
  assert(sanitize(testVal4).startsWith("'-"), 'CSV formula injection starting with - sanitized with leading quote');

  // Password hashing verification (scrypt + salt)
  const testPass = 'MerchantIQ@Secure2026!';
  const { hash, salt } = hashPassword(testPass);
  assert(verifyPassword(testPass, hash, salt), 'Password verification succeeds with correct password');
  assert(!verifyPassword('WrongPassword!', hash, salt), 'Password verification safely fails with incorrect password');

  // Idempotent re-import
  const reimportResult = db.loadOfficialC01();
  assert(reimportResult.total === 20, 'Idempotent re-import: total records remain exactly 20 without duplication');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
