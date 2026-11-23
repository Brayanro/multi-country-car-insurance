import { decodePlanPrice, isRecord, isSafeId, type Country, type PlanPrice } from '@quote/contract';
import type { reviewRows } from './quote-review';

type ReviewRow = Readonly<ReturnType<typeof reviewRows>[number]>;
export type ReceiptReview = Readonly<{
  rows: readonly ReviewRow[];
  planName: string;
  price: Readonly<PlanPrice>;
}>;

export type Receipt = Readonly<{
  number: string;
  review?: ReceiptReview;
  persisted: boolean;
}>;

export function receiptKey(country: Country) {
  return `quote-receipt-v1:${country}`;
}

function displayText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit && !!value.trim();
}

function decodeReview(input: unknown, country: Country): ReceiptReview | null {
  if (!isRecord(input)) return null;
  const { rows, planName, price: rawPrice } = input;
  const price = decodePlanPrice(rawPrice, country);
  if (!price || !displayText(planName, 240) || !Array.isArray(rows) || rows.length > 40)
    return null;
  const ids = new Set<string>();
  const displayRows: ReviewRow[] = [];
  for (const row of rows) {
    if (!isRecord(row)) return null;
    const { id, label, value } = row;
    if (
      !isSafeId(id) ||
      ids.has(id) ||
      !displayText(label, 240) ||
      typeof value !== 'string' ||
      value.length > 512
    )
      return null;
    ids.add(id);
    displayRows.push({ id, label, value });
  }
  return { rows: displayRows, planName, price };
}

export function restoreReceipt(country: Country): Receipt | null {
  try {
    const stored = sessionStorage.getItem(receiptKey(country));
    if (!stored || stored.length > 200_000) return null;
    const input: unknown = JSON.parse(stored);
    if (!isRecord(input) || input['country'] !== country) return null;
    const { version, number } = input;
    if (typeof number !== 'string' || !/^DEMO-[A-F0-9]{24}$/.test(number)) return null;
    if (version === 1 && stored.length <= 256) return { number, persisted: true };
    if (version !== 2) return null;
    const review = decodeReview(input['review'], country);
    return review ? { number, review, persisted: true } : null;
  } catch {
    return null;
  }
}
