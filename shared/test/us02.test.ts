import { describe, expect, it } from "vitest";
import { decodePlanCatalog, decodePlanPrice } from "../src/index.ts";

const plan = {
  id: "plan-a",
  name: "Esencial",
  shortDescription: "Protección básica",
  basePrice: { amountMinor: 12990050, currency: "COP" },
  coverages: ["Responsabilidad civil"],
  benefits: ["Asistencia"],
  order: 5,
  recommended: false,
};

describe("US-02 plan catalog", () => {
  it("T-US02-01/05 accepts a bounded ordered catalog and an empty catalog", () => {
    expect(
      decodePlanCatalog(
        {
          schemaVersion: 1,
          country: "co",
          plans: [{ ...plan, id: "plan-b" }, plan],
        },
        "co",
      )?.plans.map(({ id }) => id),
    ).toEqual(["plan-a", "plan-b"]);
    expect(
      decodePlanCatalog({ schemaVersion: 1, country: "cl", plans: [] }, "cl")
        ?.plans,
    ).toEqual([]);
  });

  it("T-US02-02/06 rejects cross-country, malformed, duplicate, and incompatible content", () => {
    const envelope = (plans: unknown[]) => ({
      schemaVersion: 1,
      country: "co",
      plans,
    });
    expect(decodePlanCatalog(envelope([plan]), "cl")).toBeNull();
    expect(decodePlanCatalog(envelope([plan, plan]), "co")).toBeNull();
    expect(
      decodePlanCatalog(envelope([{ ...plan, coverages: [""] }]), "co"),
    ).toBeNull();
    expect(
      decodePlanCatalog(envelope([{ ...plan, recommended: "true" }]), "co"),
    ).toBeNull();
    expect(
      decodePlanCatalog(
        envelope([
          { ...plan, basePrice: { amountMinor: 24900, currency: "CLP" } },
        ]),
        "co",
      ),
    ).toBeNull();
    expect(
      decodePlanPrice(
        { amountMinor: 1_000_000_000_000, currency: "COP" },
        "co",
      ),
    ).toBeNull();
  });
});
