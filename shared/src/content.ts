export type Country = "co" | "cl";

export function isCountry(value: unknown): value is Country {
  return value === "co" || value === "cl";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
