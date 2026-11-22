import {
  decodePlanCatalog,
  isRecord,
  MAX_PLANS,
  type Country,
} from "@quote/contract";

export const PLAN_UID = "api::quote-content.plan";

function minorUnits(value: unknown, country: Country): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const decimal = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!decimal || (country === "cl" && decimal[2])) return null;
  const [, whole, fraction = ""] = decimal;
  return Number(country === "co" ? whole + fraction.padEnd(2, "0") : whole);
}

function entries(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry: unknown) => (isRecord(entry) ? entry["text"] : null))
    : null;
}

export function projectPlans(documents: readonly unknown[], country: Country) {
  if (documents.length > MAX_PLANS) return null;
  const plans = documents.map((plan) => {
    if (
      !isRecord(plan) ||
      plan["country"] !== country ||
      plan["active"] !== true
    )
      return null;
    return {
      id: plan["documentId"],
      name: plan["name"],
      shortDescription: plan["shortDescription"],
      basePrice: {
        amountMinor: minorUnits(plan["basePrice"], country),
        currency: plan["currency"],
      },
      coverages: entries(plan["coverages"]),
      benefits: entries(plan["benefits"]),
      order: plan["order"],
      recommended: plan["recommended"],
    };
  });
  return decodePlanCatalog({ schemaVersion: 1, country, plans }, country);
}
