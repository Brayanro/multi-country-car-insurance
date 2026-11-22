import { isRecord, type Country } from "./content.ts";

export const MAX_PLANS = 40;
const MAX_PRICE = 999_999_999_999;
const MAX_LIST_ENTRIES = 20;

export const planCurrency = { co: "COP", cl: "CLP" } as const;
export type PlanPrice = {
  amountMinor: number;
  currency: (typeof planCurrency)[Country];
};

export type Plan = {
  id: string;
  name: string;
  shortDescription: string;
  basePrice: PlanPrice;
  coverages: readonly string[];
  benefits: readonly string[];
  order: number;
  recommended: boolean;
};

export type PlanCatalog = {
  schemaVersion: 1;
  country: Country;
  plans: readonly Plan[];
};

export function isPlanId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value);
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function decodePlanPrice(
  input: unknown,
  country: Country,
): PlanPrice | null {
  if (!isRecord(input)) return null;
  const { amountMinor, currency } = input;
  if (
    currency !== planCurrency[country] ||
    !isNonnegativeInteger(amountMinor) ||
    amountMinor > MAX_PRICE
  )
    return null;
  return { amountMinor, currency: planCurrency[country] };
}

function isPlanText(value: unknown): value is string {
  return (
    typeof value === "string" && value.length <= 240 && value.trim().length > 0
  );
}

function isTextList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_LIST_ENTRIES &&
    value.every(isPlanText)
  );
}

function decodePlan(value: unknown, country: Country): Plan | null {
  if (!isRecord(value)) return null;
  const {
    id,
    name,
    shortDescription,
    order,
    coverages,
    benefits,
    recommended,
  } = value;
  const basePrice = decodePlanPrice(value["basePrice"], country);
  if (
    !isPlanId(id) ||
    !isPlanText(name) ||
    !isPlanText(shortDescription) ||
    !isNonnegativeInteger(order) ||
    !isTextList(coverages) ||
    !isTextList(benefits) ||
    typeof recommended !== "boolean" ||
    !basePrice
  )
    return null;
  return {
    id,
    name,
    shortDescription,
    order,
    coverages,
    benefits,
    recommended,
    basePrice,
  };
}

export function decodePlanCatalog(
  input: unknown,
  country: Country,
): PlanCatalog | null {
  if (
    !isRecord(input) ||
    input["schemaVersion"] !== 1 ||
    input["country"] !== country
  )
    return null;
  const entries = input["plans"];
  if (!Array.isArray(entries) || entries.length > MAX_PLANS) return null;
  const plans: Plan[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    const plan = decodePlan(entry, country);
    if (!plan || ids.has(plan.id)) return null;
    ids.add(plan.id);
    plans.push(plan);
  }
  plans.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
  return { schemaVersion: 1, country, plans };
}
