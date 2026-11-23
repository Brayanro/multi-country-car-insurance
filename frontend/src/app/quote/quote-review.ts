import type { FieldDefinition, FieldValue, FormDefinition, QuoteDraft } from '@quote/contract';

function maskDocument(value: string): string {
  const alphanumeric = /[\p{L}\p{N}]/u;
  const characters = [...value];
  const count = characters.filter((character) => alphanumeric.test(character)).length;
  if (!count) return '•'.repeat(characters.length);
  const visible = count > 4 ? 4 : count > 1 ? 1 : 0;
  let hidden = count - visible;
  return characters
    .map((character) => (alphanumeric.test(character) && hidden-- > 0 ? '•' : character))
    .join('');
}

function displayValue(field: FieldDefinition, value: FieldValue): string {
  if (field.purpose === 'identityDocument') return maskDocument(String(value));
  if (field.kind === 'select') return field.options.find(({ id }) => id === value)?.label ?? '';
  if (field.kind === 'checkbox') return value ? 'Sí' : 'No';
  if (field.kind === 'date') return String(value).split('-').reverse().join('/');
  return String(value);
}

export function reviewRows(form: FormDefinition, draft: QuoteDraft) {
  return form.fields.flatMap((field) => {
    const value = draft[field.id]?.value;
    return value == null || value === ''
      ? []
      : [{ id: field.id, label: field.label, value: displayValue(field, value) }];
  });
}
