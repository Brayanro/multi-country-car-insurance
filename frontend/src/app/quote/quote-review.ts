import {
  IDENTITY_DOCUMENT_FIELD_ID,
  type FieldDefinition,
  type FieldValue,
  type FormDefinition,
  type QuoteDraft,
} from '@quote/contract';

const alphanumeric = /[\p{L}\p{N}]/u;
const maskGlyph = '•';

export type ReviewRow = Readonly<{
  id: string;
  kind: 'masked-identity' | 'ordinary';
  label: string;
  value: string;
}>;

export function isMaskedDocument(value: string): boolean {
  const firstMask = value.indexOf(maskGlyph);
  const firstVisible = value.search(alphanumeric);
  return (
    firstMask >= 0 &&
    (firstVisible < 0 || firstMask < firstVisible) &&
    [...value].filter((character) => alphanumeric.test(character)).length <= 4
  );
}

function maskDocument(value: string): string {
  const characters = [...value];
  const count = characters.filter((character) => alphanumeric.test(character)).length;
  if (!count) return maskGlyph.repeat(characters.length);
  const visible = count > 4 ? 4 : count > 1 ? 1 : 0;
  let hidden = count - visible;
  return characters
    .map((character) => (alphanumeric.test(character) && hidden-- > 0 ? maskGlyph : character))
    .join('');
}

function displayValue(field: FieldDefinition, value: FieldValue): string {
  if (field.kind === 'select') return field.options.find(({ id }) => id === value)?.label ?? '';
  if (field.kind === 'checkbox') return value ? 'Sí' : 'No';
  if (field.kind === 'date') return String(value).split('-').reverse().join('/');
  return String(value);
}

export function reviewRows(form: FormDefinition, draft: QuoteDraft): ReviewRow[] {
  return form.fields.flatMap<ReviewRow>((field) => {
    const value = draft[field.id]?.value;
    if (value == null || value === '') return [];
    const { id, label } = field;
    if (id === IDENTITY_DOCUMENT_FIELD_ID) {
      return [{ id, kind: 'masked-identity', label, value: maskDocument(String(value)) }];
    }
    return [{ id, kind: 'ordinary', label, value: displayValue(field, value) }];
  });
}
