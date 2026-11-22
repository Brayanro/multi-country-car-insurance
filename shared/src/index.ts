import { isRecord, type Country } from "./content.ts";
export { isCountry, isRecord, type Country } from "./content.ts";
import { compilePattern, matchesPattern } from "./pattern.ts";
export { matchesPattern };

export type FieldValue = string | number | boolean;
export type FieldKind = "text" | "number" | "select" | "date" | "checkbox";
type FieldPurpose =
  | "dateOfBirth"
  | "vehicleYear"
  | "identityDocument"
  | "licensePlate";

type Rule =
  | { operator: "required" | "email" | "vehicleYearRange"; message: string }
  | {
      operator: "minLength" | "maxLength" | "min" | "max" | "minimumAge";
      argument: number;
      message: string;
    }
  | {
      operator: "pattern" | "minDate" | "maxDate";
      argument: string;
      message: string;
    };

type FieldCommon = {
  id: string;
  label: string;
  helpText: string;
  errorMessage: string;
  required: boolean;
  order: number;
  rules: readonly Rule[];
  purpose?: FieldPurpose;
};
type Option = { id: string; label: string };
export type FieldDefinition = FieldCommon &
  (
    | { kind: "text" | "date"; defaultValue?: string }
    | { kind: "number"; defaultValue?: number }
    | { kind: "checkbox"; defaultValue?: boolean }
    | { kind: "select"; defaultValue?: string; options: readonly Option[] }
  );

export type FormDefinition = {
  schemaVersion: 1;
  country: Country;
  fields: readonly FieldDefinition[];
};
export type DraftEntry = { kind: FieldKind; value: FieldValue | null };
export type QuoteDraft = Readonly<Record<string, DraftEntry>>;

const kinds: readonly FieldKind[] = [
  "text",
  "number",
  "select",
  "date",
  "checkbox",
];
const purposeKinds: Record<FieldPurpose, FieldKind> = {
  dateOfBirth: "date",
  vehicleYear: "number",
  identityDocument: "text",
  licensePlate: "text",
};
const MAX_FIELDS = 40;
const MAX_OPTIONS = 60;
const MAX_RULES = 12;
const MAX_TEXT = 240;
const MAX_INPUT = 256;

export function isSafeId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z][a-z0-9-]{0,39}$/.test(value) &&
    value !== "constructor"
  );
}

export function isFieldKind(value: unknown): value is FieldKind {
  return kinds.some((kind) => kind === value);
}

function copy(value: unknown, allowEmpty = false): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_TEXT &&
    (allowEmpty || !!value.trim())
  );
}

function boundedInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    day <=
    [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  );
}

export function isKindValue(
  kind: FieldKind,
  value: unknown,
): value is FieldValue {
  switch (kind) {
    case "text":
      return typeof value === "string" && [...value].length <= MAX_INPUT;
    case "select":
      return isSafeId(value);
    case "date":
      return isCalendarDate(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "checkbox":
      return typeof value === "boolean";
  }
}

function represents(
  field: FieldDefinition,
  value: unknown,
): value is FieldValue {
  return (
    isKindValue(field.kind, value) &&
    (field.kind !== "select" || field.options.some(({ id }) => id === value))
  );
}

function decodeRule(
  input: unknown,
  kind: FieldKind,
  purpose?: FieldPurpose,
): Rule | null {
  if (!isRecord(input) || !copy(input["message"])) return null;
  const { operator, argument, message } = input;
  switch (operator) {
    case "required":
      return argument === undefined ? { operator, message } : null;
    case "email":
      return kind === "text" && argument === undefined
        ? { operator, message }
        : null;
    case "vehicleYearRange":
      return kind === "number" &&
        purpose === "vehicleYear" &&
        argument === undefined
        ? { operator, message }
        : null;
    case "minimumAge":
      return kind === "date" && purpose === "dateOfBirth" && argument === 18
        ? { operator, argument, message }
        : null;
    case "minLength":
    case "maxLength":
      return kind === "text" &&
        boundedInteger(argument) &&
        argument <= MAX_INPUT
        ? { operator, argument, message }
        : null;
    case "min":
    case "max":
      return kind === "number" &&
        typeof argument === "number" &&
        Number.isFinite(argument)
        ? { operator, argument, message }
        : null;
    case "minDate":
    case "maxDate":
      return kind === "date" && isCalendarDate(argument)
        ? { operator, argument, message }
        : null;
    case "pattern":
      return kind === "text" &&
        typeof argument === "string" &&
        compilePattern(argument)
        ? { operator, argument, message }
        : null;
    default:
      return null;
  }
}

function validRanges(rules: readonly Rule[]): boolean {
  const lowerBounds = {
    min: "max",
    minDate: "maxDate",
    minLength: "maxLength",
  } as const;
  return rules.every((rule) => {
    if (
      rule.operator !== "min" &&
      rule.operator !== "minDate" &&
      rule.operator !== "minLength"
    )
      return true;
    const upper = lowerBounds[rule.operator];
    return !rules.some(
      (other) =>
        other.operator === upper &&
        "argument" in other &&
        rule.argument > other.argument,
    );
  });
}

function decodeOptions(input: unknown, required: boolean): Option[] | null {
  if (
    !Array.isArray(input) ||
    input.length > MAX_OPTIONS ||
    (required && !input.length)
  )
    return null;
  const options: Option[] = [];
  const ids = new Set<string>();
  for (const option of input) {
    if (
      !isRecord(option) ||
      !isSafeId(option["id"]) ||
      ids.has(option["id"]) ||
      !copy(option["label"])
    )
      return null;
    ids.add(option["id"]);
    options.push({ id: option["id"], label: option["label"] });
  }
  return options;
}

function fieldShape(
  common: FieldCommon,
  kind: FieldKind,
  options: unknown,
  value: unknown,
): FieldDefinition | null {
  if (kind === "select") {
    const parsedOptions = decodeOptions(options, common.required);
    if (
      !parsedOptions ||
      (value !== undefined && (common.required || !isSafeId(value)))
    )
      return null;
    return {
      ...common,
      kind,
      options: parsedOptions,
      ...(typeof value === "string" && { defaultValue: value }),
    };
  }
  if (options !== undefined) return null;
  switch (kind) {
    case "checkbox":
      if (value !== undefined && typeof value !== "boolean") return null;
      return {
        ...common,
        kind,
        ...(typeof value === "boolean" && { defaultValue: value }),
      };
    case "number":
      if (
        value !== undefined &&
        (typeof value !== "number" || !Number.isFinite(value))
      )
        return null;
      return {
        ...common,
        kind,
        ...(typeof value === "number" && { defaultValue: value }),
      };
    case "text":
    case "date":
      if (
        value !== undefined &&
        (typeof value !== "string" || !isKindValue(kind, value))
      )
        return null;
      return {
        ...common,
        kind,
        ...(typeof value === "string" && { defaultValue: value }),
      };
  }
}

function decodeField(input: unknown, now: Date | null): FieldDefinition | null {
  if (!isRecord(input)) return null;
  const {
    id,
    label,
    helpText,
    errorMessage,
    required,
    order,
    kind,
    purpose,
    rules,
    options,
    defaultValue,
  } = input;
  if (
    !isSafeId(id) ||
    !copy(label) ||
    !copy(helpText, true) ||
    !copy(errorMessage) ||
    typeof required !== "boolean" ||
    !boundedInteger(order) ||
    !isFieldKind(kind) ||
    !Array.isArray(rules) ||
    rules.length > MAX_RULES
  )
    return null;
  let parsedPurpose: FieldPurpose | undefined;
  if (purpose !== undefined) {
    if (typeof purpose !== "string" || !Object.hasOwn(purposeKinds, purpose))
      return null;
    parsedPurpose = purpose as FieldPurpose;
    if (purposeKinds[parsedPurpose] !== kind) return null;
  }
  const parsedRules: Rule[] = [];
  for (const rule of rules) {
    const parsed = decodeRule(rule, kind, parsedPurpose);
    if (!parsed) return null;
    if (
      parsed.operator === "required" &&
      (!required || parsedRules.some((r) => r.operator === "required"))
    )
      return null;
    parsedRules.push(parsed);
  }
  if (!validRanges(parsedRules)) return null;
  if (
    parsedPurpose === "dateOfBirth" &&
    (!required || !parsedRules.some((r) => r.operator === "minimumAge"))
  )
    return null;
  if (
    parsedPurpose === "vehicleYear" &&
    (!required || !parsedRules.some((r) => r.operator === "vehicleYearRange"))
  )
    return null;
  const field = fieldShape(
    {
      id,
      label,
      helpText,
      errorMessage,
      required,
      order,
      purpose: parsedPurpose,
      rules: parsedRules,
    },
    kind,
    options,
    defaultValue,
  );
  return field &&
    (defaultValue === undefined ||
      !validateValue(field, defaultValue, now).length)
    ? field
    : null;
}

/** Pass null at publication time to defer civil-calendar bounds to the browser. */
export function decodeForm(
  input: unknown,
  country: Country,
  now: Date | null = new Date(),
): FormDefinition | null {
  if (
    !isRecord(input) ||
    input["schemaVersion"] !== 1 ||
    input["country"] !== country ||
    !Array.isArray(input["fields"]) ||
    input["fields"].length === 0 ||
    input["fields"].length > MAX_FIELDS
  )
    return null;
  const ids = new Set<string>();
  const purposes = new Set<FieldPurpose>();
  const fields: FieldDefinition[] = [];
  for (const raw of input["fields"]) {
    const field = decodeField(raw, now);
    if (
      !field ||
      ids.has(field.id) ||
      (field.purpose && purposes.has(field.purpose))
    )
      return null;
    ids.add(field.id);
    if (field.purpose) purposes.add(field.purpose);
    fields.push(field);
  }
  if (!purposes.has("dateOfBirth") || !purposes.has("vehicleYear")) return null;
  fields.sort(
    (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return { schemaVersion: 1, country, fields };
}

function ageOn(date: string, now: Date): number {
  const [year, month, day] = date.split("-").map(Number);
  const birthdayPassed =
    now.getMonth() + 1 > month ||
    (now.getMonth() + 1 === month && now.getDate() >= day);
  return now.getFullYear() - year - (birthdayPassed ? 0 : 1);
}

function rulePasses(rule: Rule, value: FieldValue, now: Date | null): boolean {
  switch (rule.operator) {
    case "required":
      return true;
    case "email":
      return (
        typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      );
    case "minLength":
      return typeof value === "string" && [...value].length >= rule.argument;
    case "maxLength":
      return typeof value === "string" && [...value].length <= rule.argument;
    case "pattern":
      return typeof value === "string" && matchesPattern(rule.argument, value);
    case "min":
      return typeof value === "number" && value >= rule.argument;
    case "max":
      return typeof value === "number" && value <= rule.argument;
    case "minDate":
      return typeof value === "string" && value >= rule.argument;
    case "maxDate":
      return typeof value === "string" && value <= rule.argument;
    case "minimumAge":
      return (
        typeof value === "string" &&
        (now === null || ageOn(value, now) >= rule.argument)
      );
    case "vehicleYearRange": {
      if (typeof value !== "number" || !Number.isSafeInteger(value))
        return false;
      if (now === null) return true;
      const year = now.getFullYear();
      return year - 20 <= value && value <= year + 1;
    }
  }
}

export function validateField(
  field: FieldDefinition,
  value: unknown,
  now = new Date(),
): string[] {
  return validateValue(field, value, now);
}

function validateValue(
  field: FieldDefinition,
  value: unknown,
  now: Date | null,
): string[] {
  const unset = value == null || (typeof value === "string" && !value.trim());
  const missing = unset || (field.kind === "checkbox" && value === false);
  const failures: string[] = [];
  if (field.required && missing) {
    failures.push(
      field.rules.find((rule) => rule.operator === "required")?.message ??
        field.errorMessage,
    );
  }
  if (!unset) {
    if (represents(field, value)) {
      for (const rule of field.rules) {
        if (!rulePasses(rule, value, now)) failures.push(rule.message);
      }
    } else if (!failures.length) failures.push(field.errorMessage);
  }
  return failures;
}

export function reconcileDraft(
  fields: readonly FieldDefinition[],
  draft: QuoteDraft,
): QuoteDraft {
  const entries: Array<[string, DraftEntry]> = [];
  for (const field of fields) {
    if (!Object.hasOwn(draft, field.id)) {
      if (field.defaultValue !== undefined)
        entries.push([
          field.id,
          { kind: field.kind, value: field.defaultValue },
        ]);
      continue;
    }
    const { kind, value } = draft[field.id];
    const compatibleKind =
      kind === field.kind ||
      (kind === "text" && field.kind === "date") ||
      (kind === "date" && field.kind === "text");
    entries.push([
      field.id,
      {
        kind: field.kind,
        value: compatibleKind && represents(field, value) ? value : null,
      },
    ]);
  }
  return Object.fromEntries(entries);
}

export {
  decodePlanCatalog,
  decodePlanPrice,
  isPlanId,
  MAX_PLANS,
  planCurrency,
  type Plan,
  type PlanCatalog,
  type PlanPrice,
} from "./plans.ts";
