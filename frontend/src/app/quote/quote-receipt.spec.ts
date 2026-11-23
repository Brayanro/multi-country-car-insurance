import { afterEach, describe, expect, it } from 'vitest';
import { receiptKey, restoreReceipt } from './quote-receipt';

const number = 'DEMO-' + 'A'.repeat(24);
const row = { id: 'identity-document', label: 'Documento', value: '••••0012' };
const review = { rows: [row], planName: 'Plan A', price: { amountMinor: 10000, currency: 'COP' } };
const receipt = { version: 2, country: 'co', number, review };

function read(value: unknown) {
  sessionStorage.setItem(receiptKey('co'), JSON.stringify(value));
  return restoreReceipt('co');
}

describe('AC-US03-R01/R02 stored terminal receipt', () => {
  afterEach(() => sessionStorage.clear());

  it('restores the legacy reference and the exact captured review when available', () => {
    expect(read({ version: 1, country: 'co', number })).toEqual({ number, persisted: true });
    expect(read(receipt)).toEqual({ number, persisted: true, review });
    const supplementary = '😀'.repeat(256);
    const wideReview = { ...review, rows: [{ ...row, value: supplementary }] };
    expect(read({ ...receipt, review: wideReview })?.review).toEqual(wideReview);
  });

  it('rejects malformed v2 records without falling back to the reference', () => {
    for (const value of [
      { ...receipt, country: 'cl' },
      { ...receipt, version: 3 },
      { ...receipt, review: undefined },
      { ...receipt, review: { ...review, rows: [row, row] } },
      { ...receipt, review: { ...review, rows: [{ ...row, label: 'x'.repeat(241) }] } },
      { ...receipt, review: { ...review, rows: [{ ...row, value: '😀'.repeat(257) }] } },
      { ...receipt, review: { ...review, price: { ...review.price, currency: 'CLP' } } },
      { ...receipt, padding: 'x'.repeat(200000) },
    ])
      expect(read(value)).toBeNull();
  });
});
