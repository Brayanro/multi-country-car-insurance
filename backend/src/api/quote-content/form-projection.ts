import { decodeForm, isRecord, type Country } from "@quote/contract";

export const FORM_UID = "api::quote-content.form-configuration";

// Keep scalars inside an object in Strapi JSON fields so SQLite preserves
// Boolean and string types through storage and editorial round trips.
function scalar(raw: unknown): unknown {
  if (raw === null || raw === undefined) return undefined;
  return isRecord(raw) && Object.keys(raw).length === 1 && raw["value"] != null
    ? raw["value"]
    : raw;
}

function projectField(raw: unknown): unknown {
  if (!isRecord(raw)) return null;
  const {
    fieldKey,
    label,
    helpText,
    errorMessage,
    kind,
    required,
    order,
    purpose,
    defaultValue,
    rules,
    options,
  } = raw;
  return {
    id: fieldKey,
    label,
    helpText: helpText === null ? "" : helpText,
    errorMessage,
    kind,
    required,
    order,
    purpose: purpose ?? undefined,
    defaultValue: scalar(defaultValue),
    rules: Array.isArray(rules)
      ? rules.map((rule: unknown) =>
          isRecord(rule)
            ? {
                operator: rule["operator"],
                argument: scalar(rule["argument"]),
                message: rule["message"],
              }
            : null,
        )
      : rules,
    options:
      Array.isArray(options) && (kind === "select" || options.length)
        ? options.map((option: unknown) =>
            isRecord(option)
              ? { id: option["optionKey"], label: option["label"] }
              : null,
          )
        : undefined,
  };
}

export function projectForm(document: unknown, country: Country) {
  if (!isRecord(document) || !Array.isArray(document["fields"])) return null;
  return decodeForm(
    {
      schemaVersion: 1,
      country: document["country"],
      fields: document["fields"].map(projectField),
    },
    country,
  );
}
