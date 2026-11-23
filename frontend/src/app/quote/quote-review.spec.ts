import type { FormDefinition } from '@quote/contract';
import { describe, expect, it } from 'vitest';
import { reviewRows } from './quote-review';

const form: FormDefinition = {
  schemaVersion: 1,
  country: 'cl',
  fields: [
    {
      id: 'identity',
      kind: 'text',
      purpose: 'identityDocument',
      label: 'RUT',
      helpText: '',
      errorMessage: 'Revisa tu documento.',
      required: true,
      order: 1,
      rules: [],
    },
  ],
};

describe('T-US03-02 identity document projection', () => {
  it.each([
    ['12.345.678-K', '••.•••.678-K'],
    ['12-A', '••-A'],
    ['A', '•'],
    ['---', '•••'],
  ])('masks each document according to its length', (value, expected) => {
    expect(reviewRows(form, { identity: { kind: 'text', value } })).toEqual([
      { id: 'identity', label: 'RUT', value: expected },
    ]);
  });
});
