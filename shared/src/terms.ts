import { isRecord, type Country } from "./content.ts";

export const MAX_TERMS_LENGTH = 20_000;

export type Terms = {
  schemaVersion: 1;
  country: Country;
  revision: string;
  text: string;
};

export function decodeTerms(input: unknown, country: Country): Terms | null {
  if (!isRecord(input)) return null;
  const { schemaVersion, revision, text } = input;
  if (
    schemaVersion !== 1 ||
    input["country"] !== country ||
    typeof revision !== "string" ||
    !/^[0-9a-f]{64}$/.test(revision) ||
    typeof text !== "string" ||
    text.length > MAX_TERMS_LENGTH ||
    !text.trim()
  )
    return null;
  return { schemaVersion, country, revision, text };
}
