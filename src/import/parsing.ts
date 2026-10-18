export interface NormalizedReviewRecord {
  [key: string]: unknown;
}

export interface ImportParseResult {
  records: NormalizedReviewRecord[];
  rejectedRows: { row: number; message: string }[];
}

export function validateReviewRecord(record: unknown): { field: string; message: string } | null {
  if (!isRecord(record)) return { field: 'record', message: 'Each review record must be an object' };
  const reviewId = String(record.review_id ?? record.id ?? record.reviewId ?? '').trim();
  if (!reviewId) return { field: 'review_id', message: 'Missing review_id' };
  const reviewText = String(record.review_text ?? record.text ?? record.content ?? record.review ?? '').trim();
  if (!reviewText) return { field: 'review_text', message: 'Review text cannot be empty' };
  const rating = Number(record.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { field: 'rating', message: 'Rating must be a number between 1 and 5' };
  }
  return null;
}

export function normalizeImportPayload(payload: unknown): NormalizedReviewRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.reviews)) return payload.reviews.filter(isRecord);
  const records = payload.records;
  if (Array.isArray(records)) return records.filter(isRecord);
  if (isRecord(records) && Array.isArray(records.reviews)) {
    return records.reviews.filter(isRecord);
  }
  if (isRecord(payload.records) && isRecord(payload.records.reviews)) return [];
  return [payload];
}

export function normalizeReviewImportRows(inputRecords: unknown[]): {
  validRecords: {
    review_id: string;
    product_id: string;
    product_name?: string;
    review_text: string;
    rating: number;
    created_at: string;
    evaluation_expected_topics?: string[];
  }[];
  errors: { row: number; field: string; message: string }[];
  duplicateCandidates: number;
} {
  const validRecords: ReturnType<typeof normalizeReviewImportRows>['validRecords'] = [];
  const errors: { row: number; field: string; message: string }[] = [];
  const seenIds = new Set<string>();
  let duplicateCandidates = 0;

  inputRecords.forEach((raw, index) => {
    const row = index + 1;
    const validationError = validateReviewRecord(raw);
    if (validationError) {
      errors.push({ row, ...validationError });
      return;
    }
    const source = raw as Record<string, unknown>;
    const product = source.product && typeof source.product === 'object'
      ? source.product as Record<string, unknown>
      : {};
    const reviewId = String(source.review_id ?? source.id ?? source.reviewId ?? '').trim();
    const reviewText = String(source.review_text ?? source.text ?? source.content ?? source.review ?? '').trim();
    const rating = Number(source.rating);
    const productId = String(source.product_id ?? source.productId ?? product.product_id ?? product.id ?? 'PROD-UNKNOWN').trim() || 'PROD-UNKNOWN';
    if (seenIds.has(reviewId)) {
      duplicateCandidates += 1;
      errors.push({ row, field: 'review_id', message: `Duplicate review_id in batch: ${reviewId}` });
      return;
    }
    const rawDate = source.created_at ?? source.createdAt ?? source.date;
    const parsedDate = rawDate ? new Date(String(rawDate)) : new Date();
    const createdAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    seenIds.add(reviewId);
    validRecords.push({
      review_id: reviewId,
      product_id: productId,
      product_name: String(source.product_name ?? source.productName ?? product.product_name ?? product.name ?? '') || undefined,
      review_text: reviewText,
      rating,
      created_at: createdAt,
      evaluation_expected_topics: Array.isArray(source.expected_topics)
        ? source.expected_topics.map(String)
        : Array.isArray(source.evaluation_expected_topics)
          ? source.evaluation_expected_topics.map(String)
          : undefined
    });
  });
  return { validRecords, errors, duplicateCandidates };
}
export function parseCsv(text: string): ImportParseResult {
  const rows: string[][] = [];
  const rejectedRows: { row: number; message: string }[] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (quoted) {
    rejectedRows.push({ row: rows.length + 2, message: 'Unclosed quoted field' });
  } else {
    row.push(field);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }

  if (rows.length === 0) return { records: [], rejectedRows };

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  if (headers.some((header) => !header)) {
    rejectedRows.push({ row: 1, message: 'CSV contains an empty column header' });
  }

  const records = rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      rejectedRows.push({
        row: rowIndex + 2,
        message: `Expected ${headers.length} columns but found ${values.length}`
      });
    }

    const record: NormalizedReviewRecord = {};
    headers.forEach((header, columnIndex) => {
      if (header) record[header] = values[columnIndex] ?? '';
    });
    return record;
  });

  return { records, rejectedRows };
}

export function parseImportText(text: string): ImportParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { records: [], rejectedRows: [{ row: 1, message: 'File is empty' }] };

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const records = normalizeImportPayload(parsed);
      return records.length > 0
        ? { records, rejectedRows: [] }
        : { records: [], rejectedRows: [{ row: 1, message: 'No review records found' }] };
    } catch {
      return { records: [], rejectedRows: [{ row: 1, message: 'Invalid JSON' }] };
    }
  }

  return parseCsv(text);
}

function isRecord(value: unknown): value is NormalizedReviewRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
