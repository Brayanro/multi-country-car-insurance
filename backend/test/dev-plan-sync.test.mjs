import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { createStrapi, compileStrapi } = require("@strapi/strapi");

test("US-02 development plan sync preserves documents and stops on editor changes", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "quote-plan-sync-"));
  const secret = () => randomBytes(32).toString("hex");
  Object.assign(process.env, {
    DATABASE_FILENAME: join(fixture, "strapi.sqlite"),
    STRAPI_TELEMETRY_DISABLED: "true",
    APP_KEYS: [secret(), secret()].join(","),
    ADMIN_JWT_SECRET: secret(),
    API_TOKEN_SALT: secret(),
    JWT_SECRET: secret(),
    TRANSFER_TOKEN_SALT: secret(),
    ENCRYPTION_KEY: secret(),
  });

  const context = await compileStrapi({ appDir: resolve(".") });
  const app = createStrapi(context);
  try {
    await app.load();
    const { syncDevPlans } = require("../dist/src/dev-plan-sync.js");
    const { PLAN_EXPANSION_KEY } = require("../dist/src/seed-plans.js");
    const plans = app.documents("api::quote-content.plan");
    const store = app.store({ type: "core", name: "quote-content" });
    const fixtureBenefits = [{ text: "Asistencia en carretera" }];
    const legacy = (await plans.findMany({ status: "draft" })).filter(
      ({ name }) => name !== "Integral",
    );
    const initial = await syncDevPlans(app);
    assert.equal(
      initial.status,
      "noop",
      "fresh seed already includes all plans",
    );
    assert.equal(
      Object.keys(await store.get({ key: PLAN_EXPANSION_KEY })).length,
      2,
    );
    for (const { documentId, name } of await plans.findMany({
      status: "draft",
    })) {
      if (name === "Integral") await plans.delete({ documentId });
      else
        await plans.update({
          documentId,
          status: "published",
          data: { benefits: fixtureBenefits },
        });
    }
    await store.delete({ key: PLAN_EXPANSION_KEY });

    const unrelated = await plans.create({
      data: {
        country: "co",
        name: "Plan adicional de prueba",
        shortDescription: "Sin publicar",
        basePrice: 10000,
        currency: "COP",
        active: false,
        recommended: false,
        order: 90,
      },
      status: "draft",
    });
    const admin = await app.service("admin::user").create({
      firstname: "Test",
      lastname: "Fixture",
      email: "catalog-sync@example.test",
      password: secret(),
      isActive: true,
    });
    const draftFields = (documentId) =>
      plans.findOne({ documentId, status: "draft", populate: ["benefits"] });
    const publishedFields = (documentId) =>
      plans.findOne({
        documentId,
        status: "published",
        populate: ["benefits"],
      });
    const originalCo = legacy.find(
      ({ country, name }) => country === "co" && name === "Esencial",
    );
    const ready = await syncDevPlans(app);
    assert.equal(ready.status, "ready");
    assert.equal(
      ready.actions.filter(({ kind }) => kind === "update").length,
      4,
    );
    assert.equal(
      ready.actions.filter(({ kind }) => kind === "create").length,
      2,
    );
    assert.equal(
      (await publishedFields(originalCo.documentId)).benefits.length,
      1,
      "dry run does not write",
    );

    await plans.update({
      documentId: originalCo.documentId,
      status: "draft",
      data: { shortDescription: "Cambio editorial" },
    });
    assert.equal(
      (await syncDevPlans(app, ready.fingerprint)).status,
      "blocked",
    );
    assert.equal(
      (await draftFields(originalCo.documentId)).shortDescription,
      "Cambio editorial",
    );
    for (const document of legacy)
      assert.equal(
        (await publishedFields(document.documentId)).benefits.length,
        1,
      );
    assert.equal(
      (await plans.findMany({ filters: { name: "Integral" }, status: "draft" }))
        .length,
      0,
    );
    await plans.discardDraft({ documentId: originalCo.documentId });

    assert.equal((await syncDevPlans(app, "0".repeat(64))).status, "stale");

    const coRuta = legacy.find(
      ({ country, name }) => country === "co" && name === "Ruta",
    );
    const preservedPrice = "179900.00";
    await plans.update({
      documentId: coRuta.documentId,
      status: "published",
      data: { basePrice: Number(preservedPrice) },
    });
    assert.equal((await syncDevPlans(app)).status, "blocked");
    assert.equal(
      (await syncDevPlans(app, undefined, "179900.01")).status,
      "blocked",
    );
    const verified = await syncDevPlans(app, undefined, preservedPrice);
    assert.equal(verified.status, "ready");
    assert.notEqual(verified.fingerprint, ready.fingerprint);
    assert.equal(
      (await syncDevPlans(app, ready.fingerprint, preservedPrice)).status,
      "stale",
    );
    assert.equal(
      (await syncDevPlans(app, verified.fingerprint)).status,
      "blocked",
    );

    await plans.update({
      documentId: coRuta.documentId,
      status: "draft",
      data: { basePrice: 180000 },
    });
    assert.equal(
      (await syncDevPlans(app, verified.fingerprint, preservedPrice)).status,
      "blocked",
    );
    await plans.discardDraft({ documentId: coRuta.documentId });
    await plans.update({
      documentId: coRuta.documentId,
      status: "draft",
      data: { recommended: false },
    });
    assert.equal(
      (await syncDevPlans(app, verified.fingerprint, preservedPrice)).status,
      "blocked",
    );
    await plans.discardDraft({ documentId: coRuta.documentId });
    assert.equal(
      (await syncDevPlans(app, verified.fingerprint, preservedPrice)).status,
      "applied",
    );
    for (const document of legacy) {
      const draft = await draftFields(document.documentId);
      const published = await publishedFields(document.documentId);
      assert.equal(draft.name, document.name);
      const expectedPrice =
        document.documentId === coRuta.documentId
          ? Number(preservedPrice)
          : document.basePrice;
      assert.equal(draft.basePrice, expectedPrice);
      assert.equal(published.basePrice, expectedPrice);
      assert.ok(draft.benefits.length > 1);
      assert.deepEqual(
        draft.benefits.map(({ text }) => text),
        published.benefits.map(({ text }) => text),
      );
    }
    assert.equal(
      (await draftFields(unrelated.documentId)).name,
      unrelated.name,
    );
    assert.equal(await publishedFields(unrelated.documentId), null);
    assert.equal(
      (await app.db.query("admin::user").findOne({ where: { id: admin.id } }))
        .email,
      admin.email,
    );
    const noOp = await syncDevPlans(app, undefined, preservedPrice);
    assert.equal(noOp.status, "noop");
    assert.equal(
      (await syncDevPlans(app, noOp.fingerprint, preservedPrice)).status,
      "noop",
    );
    assert.equal(
      (await plans.findMany({ filters: { name: "Integral" }, status: "draft" }))
        .length,
      2,
    );

    const { co, cl } = await store.get({ key: PLAN_EXPANSION_KEY });
    await plans.unpublish({ documentId: co });
    await plans.delete({ documentId: cl });
    assert.equal(
      (await syncDevPlans(app, undefined, preservedPrice)).status,
      "blocked",
    );
    assert.equal(await publishedFields(co), null);
    assert.equal(await draftFields(cl), null);
  } finally {
    await app.destroy();
    await rm(fixture, { recursive: true, force: true });
  }
});
