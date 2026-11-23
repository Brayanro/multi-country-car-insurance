import { describe, expect, it } from "vitest";
import { decodeTerms } from "../src/index.ts";

describe("US-03 terms contract", () => {
  const text = "Condiciones.\n\nTexto literal <b>.";
  const terms = {
    schemaVersion: 1,
    country: "co",
    revision: "a".repeat(64),
    text,
  };

  it("T-US03-03 preserves published plain text and validates country and revision", () => {
    expect(decodeTerms(terms, "co")).toEqual(terms);
    expect(decodeTerms(terms, "cl")).toBeNull();
    expect(decodeTerms({ ...terms, revision: "b" }, "co")).toBeNull();
  });

  it("T-US03-11 rejects unavailable or invalid terms bodies", () => {
    for (const text of [" ", "a".repeat(20001), null]) {
      expect(decodeTerms({ ...terms, text }, "co")).toBeNull();
    }
    expect(decodeTerms({ ...terms, schemaVersion: 2 }, "co")).toBeNull();
  });
});
