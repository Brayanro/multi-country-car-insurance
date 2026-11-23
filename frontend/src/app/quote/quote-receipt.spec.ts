import { afterEach, describe, expect, it } from 'vitest';
import { receiptKey, restoreReceipt } from './quote-receipt';

const number = 'DEMO-' + 'A'.repeat(24);
const row = {
  id: 'identity-document',
  kind: 'masked-identity',
  label: 'Documento',
  value: '••••0012',
};

describe.each(['co', 'cl'] as const)('T-US03-M05 stored terminal receipt in %s', (country) => {
  const review = {
    rows: [row],
    planName: 'Plan A',
    price: { amountMinor: 10000, currency: country === 'co' ? 'COP' : 'CLP' },
  };
  const receipt = { version: 3, country, number, review };
  const reference = { number, persisted: true };

  function read(value: unknown) {
    sessionStorage.setItem(receiptKey(country), JSON.stringify(value));
    return restoreReceipt(country);
  }

  afterEach(() => sessionStorage.clear());

  it('restores only the legacy terminal reference regardless of row provenance', () => {
    expect(read({ version: 1, country, number })).toEqual(reference);
    expect(
      read({
        ...receipt,
        version: 2,
        review: { ...review, rows: [{ id: 'unknown', label: 'Ficticio', value: 'FICTICIO-0001' }] },
      }),
    ).toEqual(reference);
  });

  it('restores a validated masked review including ordinary supplementary characters', () => {
    const wideReview = {
      ...review,
      rows: [row, { id: 'other', kind: 'ordinary', label: 'Otro', value: '😀'.repeat(256) }],
    };
    expect(read({ ...receipt, review: wideReview })).toEqual({ ...reference, review: wideReview });
  });

  it('withholds a malformed v3 review and preserves the reference', () => {
    for (const rows of [
      [],
      [row, row],
      [{ ...row, kind: 'ordinary' }],
      [{ ...row, id: 'other' }],
      [{ ...row, value: 'FICTICIO-0001' }],
      [{ ...row, value: '00••12' }],
      [{ ...row, value: '••12345' }],
      [{ ...row, label: 'x'.repeat(241) }],
      [row, { id: 'other', kind: 'ordinary', label: 'Otro', value: '😀'.repeat(257) }],
    ])
      expect(read({ ...receipt, review: { ...review, rows } })).toEqual(reference);
    expect(read({ ...receipt, review: undefined })).toEqual(reference);
  });

  it('rejects invalid headers and unknown or oversized envelopes', () => {
    for (const value of [
      { ...receipt, country: country === 'co' ? 'cl' : 'co' },
      { ...receipt, number: 'invalid' },
      { ...receipt, version: 4 },
      { ...receipt, padding: 'x'.repeat(200000) },
    ])
      expect(read(value)).toBeNull();
  });
});
