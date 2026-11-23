import { createHash } from "node:crypto";
import {
  decodeTerms,
  isRecord,
  MAX_TERMS_LENGTH,
  type Country,
} from "@quote/contract";

export const TERMS_UID = "api::quote-content.terms";

export function projectTerms(document: unknown, country: Country) {
  if (!isRecord(document)) return null;
  const text = document["body"];
  if (
    document["country"] !== country ||
    typeof text !== "string" ||
    text.length > MAX_TERMS_LENGTH
  ) {
    return null;
  }
  const revision = createHash("sha256")
    .update(JSON.stringify([1, country, text]), "utf8")
    .digest("hex");
  return decodeTerms({ schemaVersion: 1, country, revision, text }, country);
}
