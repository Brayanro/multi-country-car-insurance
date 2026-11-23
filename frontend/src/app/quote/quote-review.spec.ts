import type { FormDefinition } from '@quote/contract';
import { describe, expect, it } from 'vitest';
import { reviewRows } from './quote-review';

const form: FormDefinition = {
  schemaVersion: 1,
  country: 'cl',
  fields: [
    {
      id: 'identity-document',
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
    ['Ａ١Ｂ٢Ｃ٣', '••Ｂ٢Ｃ٣'],
  ])('masks each document according to its length', (value, expected) => {
    for (const country of ['co', 'cl'] as const) {
      const updated = {
        ...form,
        country,
        fields: form.fields.map((field) => ({ ...field, label: 'Documento revisado', order: 99 })),
      };
      expect(reviewRows(updated, { 'identity-document': { kind: 'text', value } })).toEqual([
        {
          id: 'identity-document',
          kind: 'masked-identity',
          label: 'Documento revisado',
          value: expected,
        },
      ]);
    }
  });
});
