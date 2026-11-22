import { createHash } from "node:crypto";
import { isPlanId, isRecord, type Country } from "@quote/contract";
import type { Core } from "@strapi/strapi";
import { PLAN_UID, projectPlans } from "./api/quote-content/plan-projection";
import {
  originalSeedPlans,
  PLAN_EXPANSION_KEY,
  planCountries,
  seedPlans,
} from "./seed-plans";

const statuses = ["draft", "published"] as const;
type Versions = Record<(typeof statuses)[number], readonly unknown[]>;
type ComparablePlan = Record<string, unknown> & { country: Country };
type Action = {
  country: Country;
  name: string;
} & ({ kind: "keep" | "update"; documentId: string } | { kind: "create" });
type Report = {
  actions: Action[];
  conflicts: string[];
  fingerprint: string;
  preserveCoRutaPrice?: string;
  status: "blocked" | "ready" | "noop" | "stale" | "applied";
};

function fingerprintFor(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonical(plan: Record<string, unknown>, country: Country) {
  const projected = projectPlans([{ ...plan, documentId: "fixture" }], country);
  return projected ? JSON.stringify(projected.plans[0]) : null;
}

function unchanged(plan: unknown, fixture: ComparablePlan) {
  const expected = canonical(fixture, fixture.country);
  return (
    expected !== null &&
    isRecord(plan) &&
    canonical(plan, fixture.country) === expected
  );
}

function byName(
  raw: unknown,
  country: Country,
  name: string,
): raw is Record<string, unknown> {
  return (
    isRecord(raw) &&
    raw["country"] === country &&
    typeof raw["name"] === "string" &&
    raw["name"].trim().toLowerCase() === name.toLowerCase()
  );
}

function matches(versions: Versions, country: Country, name: string) {
  return {
    draft: versions.draft.filter((raw) => byName(raw, country, name)),
    published: versions.published.filter((raw) => byName(raw, country, name)),
  };
}

function pair(candidates: ReturnType<typeof matches>) {
  const [draft] = candidates.draft;
  const [published] = candidates.published;
  const id = draft?.["documentId"];
  if (
    candidates.draft.length !== 1 ||
    candidates.published.length !== 1 ||
    !isPlanId(id) ||
    published?.["documentId"] !== id
  )
    return null;
  return { draft, published, id };
}

function planSync(
  versions: Versions,
  provenance: unknown,
  coRutaPrice: number | undefined,
) {
  const conflicts: string[] = [];
  const actions: Action[] = [];
  const tracked =
    isRecord(provenance) &&
    isPlanId(provenance["co"]) &&
    isPlanId(provenance["cl"]) &&
    provenance["co"] !== provenance["cl"]
      ? provenance
      : null;
  if (provenance != null && !tracked)
    conflicts.push("The saved Integral provenance is invalid.");

  for (const country of planCountries) {
    const originals = originalSeedPlans(country);
    const targets = seedPlans(country);
    for (const index of [0, 1] as const) {
      const preservePrice =
        country === "co" && originals[index].name === "Ruta"
          ? coRutaPrice
          : undefined;
      const original = {
        ...originals[index],
        basePrice: preservePrice ?? originals[index].basePrice,
      };
      const target = {
        ...targets[index],
        basePrice: preservePrice ?? targets[index].basePrice,
      };
      const { name } = original;
      const stock = pair(matches(versions, country, name));
      if (!stock) {
        conflicts.push(
          `${country}/${name}: expected one document with both draft and published versions.`,
        );
      } else if (
        unchanged(stock.draft, target) &&
        unchanged(stock.published, target)
      ) {
        actions.push({ country, name, kind: "keep", documentId: stock.id });
      } else if (
        unchanged(stock.draft, original) &&
        unchanged(stock.published, original)
      ) {
        actions.push({ country, name, kind: "update", documentId: stock.id });
      } else {
        conflicts.push(
          `${country}/${name}: draft or published content differs from the fixture pair.`,
        );
      }
    }
  }

  const missingIntegral: Country[] = [];
  for (const country of planCountries) {
    const target = seedPlans(country)[2];
    const { name } = target;
    const candidates = matches(versions, country, name);
    if (!tracked && !candidates.draft.length && !candidates.published.length) {
      const renamed = statuses.some((status) =>
        versions[status].some(
          (plan) => isRecord(plan) && unchanged({ ...plan, name }, target),
        ),
      );
      if (renamed)
        conflicts.push(
          `${country}/${name}: found equivalent content under a different name.`,
        );
      else missingIntegral.push(country);
      continue;
    }
    const stock = pair(candidates);
    if (
      !stock ||
      (tracked && tracked[country] !== stock.id) ||
      !unchanged(stock.draft, target) ||
      !unchanged(stock.published, target)
    ) {
      conflicts.push(
        `${country}/${name}: the document is missing, ambiguous, unpublished or edited.`,
      );
    } else {
      actions.push({ country, name, kind: "keep", documentId: stock.id });
    }
  }
  if (missingIntegral.length) {
    const pristine =
      actions.length === 4 && actions.every(({ kind }) => kind === "update");
    if (missingIntegral.length === 2 && pristine && !conflicts.length) {
      for (const country of missingIntegral)
        actions.push({ country, name: "Integral", kind: "create" });
    } else {
      for (const country of missingIntegral) {
        conflicts.push(
          `${country}/Integral: absence is ambiguous without the pristine original fixture.`,
        );
      }
    }
  }
  return { actions, conflicts };
}

export async function syncDevPlans(
  strapi: Core.Strapi,
  applyFingerprint?: string,
  preserveCoRutaPrice?: string,
): Promise<Report> {
  if (
    preserveCoRutaPrice !== undefined &&
    !/^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/.test(preserveCoRutaPrice)
  )
    throw new Error(
      "Enter the approved CO Ruta price in COP major units, with two decimal places and no separators.",
    );

  const coRutaPrice =
    preserveCoRutaPrice === undefined ? undefined : Number(preserveCoRutaPrice);
  const store = strapi.store({ type: "core", name: "quote-content" });
  return strapi.db.transaction(async (): Promise<Report> => {
    const documents = strapi.documents(PLAN_UID);
    const populate = ["coverages", "benefits"];
    const versions = {
      draft: await documents.findMany({ status: "draft", populate }),
      published: await documents.findMany({ status: "published", populate }),
    };
    const provenance: unknown = await store.get({ key: PLAN_EXPANSION_KEY });
    const { actions, conflicts } = planSync(versions, provenance, coRutaPrice);
    if ((await store.get({ key: "us02-seeded" })) !== true)
      conflicts.push("This database has no initialized US-02 seed marker.");
    const fingerprint = fingerprintFor([
      actions,
      conflicts,
      provenance,
      planCountries.map(seedPlans),
      preserveCoRutaPrice,
    ]);
    const report = { actions, conflicts, fingerprint, preserveCoRutaPrice };
    if (conflicts.length) return { ...report, status: "blocked" };
    if (applyFingerprint !== undefined && applyFingerprint !== fingerprint)
      return { ...report, status: "stale" };
    if (actions.every(({ kind }) => kind === "keep"))
      return { ...report, status: "noop" };
    if (applyFingerprint === undefined) return { ...report, status: "ready" };

    const created: Partial<Record<Country, string>> = {};
    for (const action of actions) {
      if (action.kind === "keep") continue;
      const target = seedPlans(action.country).find(
        ({ name }) => name === action.name,
      );
      if (!target) throw new Error("Target plan is missing from the fixture.");
      if (action.kind === "update") {
        const data: Record<string, unknown> = { benefits: target.benefits };
        await documents.update({
          documentId: action.documentId,
          status: "published",
          data,
        });
      } else {
        const plan = await documents.create({
          data: target,
          status: "published",
        });
        created[action.country] = plan.documentId;
      }
    }
    if (created.co && created.cl)
      await store.set({ key: PLAN_EXPANSION_KEY, value: created });
    return { ...report, status: "applied" };
  });
}
