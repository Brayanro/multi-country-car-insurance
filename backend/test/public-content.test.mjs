import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import test from "node:test";
import { createRequire } from "node:module";

const { createStrapi, compileStrapi } = createRequire(import.meta.url)(
  "@strapi/strapi",
);

test("T-US01-05/08/09 and T-US02-01/02/05 and T-US03-03/11/M02: publish, change and unpublish isolated CMS content", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "quote-cms-test-"));
  const secret = () => randomBytes(32).toString("hex");
  Object.assign(process.env, {
    DATABASE_FILENAME: join(fixture, "strapi.sqlite"),
    STRAPI_TELEMETRY_DISABLED: "true",
    HOST: "127.0.0.1",
    APP_KEYS: [secret(), secret()].join(","),
    ADMIN_JWT_SECRET: secret(),
    API_TOKEN_SALT: secret(),
    JWT_SECRET: secret(),
    TRANSFER_TOKEN_SALT: secret(),
    ENCRYPTION_KEY: secret(),
  });

  const context = await compileStrapi({ appDir: resolve(".") });
  let app = createStrapi(context);
  const readPermission = "api::quote-content.quote-content.readForm";
  const readPlansPermission = "api::quote-content.quote-content.readPlans";
  const readTermsPermission = "api::quote-content.quote-content.readTerms";
  const roles = () => app.db.query("plugin::users-permissions.role");
  const permissions = () =>
    app.db.query("plugin::users-permissions.permission");
  async function roleActions(type) {
    const role = await roles().findOne({ where: { type } });
    assert.ok(role);
    const rows = await permissions().findMany({ where: { role: role.id } });
    return rows.map(({ action }) => action).sort();
  }
  try {
    await app.load();
    app.server.listen(0, "127.0.0.1");
    await once(app.server.httpServer, "listening");
    const { port } = app.server.httpServer.address();
    const uri = `http://127.0.0.1:${port}/api/quote-content/v1/co/form`;
    const current = async () => {
      const response = await fetch(uri);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      return response.json();
    };

    // T-US02-01/02/05: the dedicated collection publishes independently.
    const plansUri = uri.replace("/form", "/plans");
    const readPlans = async (target = plansUri) => {
      const response = await fetch(target);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      return response.json();
    };
    const initialPlans = await readPlans();
    assert.equal(initialPlans.country, "co");

    const chilePlans = await readPlans(plansUri.replace("/co/", "/cl/"));
    assert.equal(chilePlans.country, "cl");
    for (const catalog of [initialPlans, chilePlans]) {
      assert.deepEqual(
        catalog.plans.map(({ name }) => name),
        ["Esencial", "Ruta", "Integral"],
      );
      assert.ok(catalog.plans.every(({ benefits }) => benefits.length > 1));
    }
    assert.ok(
      chilePlans.plans.every(({ basePrice }) => basePrice.currency === "CLP"),
    );
    const plans = app.documents("api::quote-content.plan");
    const selectedId = initialPlans.plans[0].id;
    await plans.update({
      documentId: selectedId,
      status: "draft",
      data: {
        name: "Plan ficticio revisado",
        basePrice: 129900.5,
        active: false,
      },
    });
    assert.deepEqual(await readPlans(), initialPlans);
    await plans.publish({ documentId: selectedId });
    assert.equal(
      (await readPlans()).plans.some(({ id }) => id === selectedId),
      false,
    );
    await plans.update({
      documentId: selectedId,
      status: "published",
      data: { active: true },
    });
    assert.deepEqual(
      (await readPlans()).plans.find(({ id }) => id === selectedId)?.basePrice,
      { amountMinor: 12990050, currency: "COP" },
    );
    for (const { id } of initialPlans.plans)
      await plans.unpublish({ documentId: id });
    assert.deepEqual((await readPlans()).plans, []);
    assert.equal((await fetch(plansUri + "?status=draft")).status, 400);
    assert.equal((await fetch(new URL("/api/plans", plansUri))).status, 404);

    const termsUri = uri.replace("/form", "/terms");
    const readTerms = async (target = termsUri) => {
      const response = await fetch(target);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      return response.json();
    };
    const terms = app.documents("api::quote-content.terms");
    const coTerms = await readTerms();
    const clTermsUri = termsUri.replace("/co/", "/cl/");
    const clTerms = await readTerms(clTermsUri);
    assert.equal(coTerms.country, "co");
    assert.equal(clTerms.country, "cl");
    assert.notEqual(coTerms.text, clTerms.text);
    assert.notEqual(coTerms.revision, clTerms.revision);
    const termsDraft = await terms.findFirst({
      status: "draft",
      filters: { country: "co" },
    });
    const text = "Condiciones revisadas.\n\nTexto literal <b>.";
    await terms.update({
      documentId: termsDraft.documentId,
      status: "draft",
      data: { body: text },
    });
    assert.deepEqual(await readTerms(), coTerms);
    await terms.publish({ documentId: termsDraft.documentId });
    const revised = await readTerms();
    assert.deepEqual(Object.keys(revised).sort(), [
      "country",
      "revision",
      "schemaVersion",
      "text",
    ]);
    assert.equal(revised.text, text);
    assert.notEqual(revised.revision, coTerms.revision);
    await terms.publish({ documentId: termsDraft.documentId });
    assert.deepEqual(await readTerms(), revised);
    assert.deepEqual(await readTerms(clTermsUri), clTerms);
    assert.equal((await fetch(termsUri + "?status=draft")).status, 400);
    assert.equal(
      (await fetch(new URL("/api/quote-terms", termsUri))).status,
      404,
    );
    assert.equal((await fetch(termsUri, { method: "POST" })).status, 405);
    const duplicate = await terms.create({
      status: "published",
      data: { country: "co", body: "Duplicado" },
    });
    assert.equal((await fetch(termsUri)).status, 503);
    await terms.unpublish({ documentId: duplicate.documentId });
    await terms.unpublish({ documentId: termsDraft.documentId });
    const unpublishedTerms = await fetch(termsUri);
    assert.equal(unpublishedTerms.status, 404);
    assert.deepEqual(await unpublishedTerms.json(), {
      error: { code: "TERMS_NOT_PUBLISHED" },
    });

    const initial = await current();
    assert.equal(
      initial.fields.find(({ id }) => id === "accessories").defaultValue,
      false,
    );
    assert.equal(
      initial.fields.some(({ id }) => id === "agency"),
      false,
    );

    const documents = app.documents("api::quote-content.form-configuration");
    const draft = await documents.findFirst({
      status: "draft",
      filters: { country: "co" },
      populate: { fields: { populate: ["options", "rules"] } },
    });
    assert.ok(draft);
    const added = {
      fieldKey: "agency",
      label: "Agencia de ejemplo",
      helpText: "",
      errorMessage: "Revisa la agencia.",
      kind: "text",
      required: false,
      order: 35,
    };
    const serverLocalTooOld = new Date().getFullYear() - 21;
    await documents.update({
      documentId: draft.documentId,
      status: "draft",
      data: {
        fields: [
          ...draft.fields
            .filter(({ fieldKey }) => fieldKey !== "accessories")
            .map((field) =>
              field.fieldKey === "vehicle-year"
                ? { ...field, defaultValue: { value: serverLocalTooOld } }
                : field,
            ),
          added,
        ],
      },
    });
    assert.deepEqual(await current(), initial);

    await documents.publish({ documentId: draft.documentId });
    const published = await current();
    assert.equal(
      published.fields.find(({ id }) => id === "vehicle-year").defaultValue,
      serverLocalTooOld,
      "the API serves structurally valid defaults for the browser to validate against its civil date",
    );
    assert.equal(
      published.fields.some(({ id }) => id === "accessories"),
      false,
    );
    assert.equal(
      published.fields.find(({ id }) => id === "agency").label,
      "Agencia de ejemplo",
    );
    assert.equal(
      published.fields.findIndex(({ id }) => id === "agency"),
      published.fields.findIndex(({ id }) => id === "identity-document") + 1,
    );

    // T-US03-M02: a published identity marker cannot be removed or relocated.
    for (const country of ["co", "cl"]) {
      const formUri = uri.replace("/co/", `/${country}/`);
      const activeDraft = await documents.findFirst({
        status: "draft",
        filters: { country },
        populate: { fields: { populate: ["options", "rules"] } },
      });
      assert.ok(activeDraft);
      const identity = activeDraft.fields.find(
        ({ fieldKey }) => fieldKey === "identity-document",
      );
      assert.ok(identity);
      const validRevision = activeDraft.fields.map((field) =>
        field.fieldKey === "identity-document"
          ? {
              ...field,
              label: `Documento ficticio actualizado ${country.toUpperCase()}`,
              order: 1,
            }
          : field,
      );
      await documents.update({
        documentId: activeDraft.documentId,
        status: "published",
        data: { fields: validRevision },
      });
      const validPublished = await fetch(formUri);
      assert.equal(validPublished.status, 200);
      const validPublishedForm = await validPublished.json();
      const publishedIdentity = validPublishedForm.fields.find(
        ({ id }) => id === "identity-document",
      );
      assert.equal(
        publishedIdentity.label,
        `Documento ficticio actualizado ${country.toUpperCase()}`,
      );
      assert.equal(publishedIdentity.order, 1);
      assert.equal(publishedIdentity.purpose, "identityDocument");

      const fields = activeDraft.fields.map((field) =>
        field === identity ? { ...field, purpose: null } : field,
      );
      const { id: _id, ...otherIdentity } = identity;
      await documents.update({
        documentId: activeDraft.documentId,
        status: "published",
        data: {
          fields: [
            ...fields,
            { ...otherIdentity, fieldKey: "other-document", rules: [] },
          ],
        },
      });
      const invalid = await fetch(formUri);
      assert.equal(invalid.status, 503);
      assert.deepEqual(await invalid.json(), {
        error: { code: "FORM_UNAVAILABLE" },
      });
      await documents.update({
        documentId: activeDraft.documentId,
        status: "published",
        data: { fields: activeDraft.fields },
      });
      const recovered = await fetch(formUri);
      assert.equal(recovered.status, 200);
      assert.equal(
        (await recovered.json()).fields.find(
          ({ id }) => id === "identity-document",
        ).purpose,
        "identityDocument",
      );
    }

    await documents.unpublish({ documentId: draft.documentId });
    const unavailable = await fetch(uri);
    assert.equal(unavailable.status, 404);
    assert.deepEqual(await unavailable.json(), {
      error: { code: "FORM_NOT_PUBLISHED" },
    });
    const chile = await fetch(uri.replace("/co/", "/cl/"));
    assert.equal(chile.status, 200);
    assert.equal((await chile.json()).country, "cl");

    // US01-R05: anonymous permissions are distinct from Strapi administrators.
    assert.deepEqual(await roleActions("public"), [
      readPermission,
      readPlansPermission,
      readTermsPermission,
    ]);
    const base = new URL(uri).origin;
    assert.equal((await fetch(`${base}/admin/init`)).status, 200);
    assert.equal(
      (await fetch(`${base}/api/auth/email-confirmation`)).status,
      403,
    );
    const authenticatedActions = await roleActions("authenticated");
    const publicRole = await roles().findOne({ where: { type: "public" } });
    await permissions().create({
      data: {
        role: publicRole.id,
        action: "plugin::users-permissions.auth.register",
      },
    });
    await app.destroy();

    app = createStrapi(context);
    await app.load();
    assert.deepEqual(await roleActions("public"), [
      readPermission,
      readPlansPermission,
      readTermsPermission,
    ]);
    assert.deepEqual(await roleActions("authenticated"), authenticatedActions);
    const co = await app
      .documents("api::quote-content.form-configuration")
      .findFirst({
        status: "published",
        filters: { country: "co" },
      });
    assert.equal(
      co,
      null,
      "restarting the initialized fixture preserves unpublication",
    );
    assert.equal(
      await app.documents("api::quote-content.terms").findFirst({
        status: "published",
        filters: { country: "co" },
      }),
      null,
      "a restart preserves deliberately unpublished terms",
    );
    const restartedPlans = await app
      .documents("api::quote-content.plan")
      .findMany({
        status: "published",
        filters: { country: "co" },
      });
    assert.deepEqual(
      restartedPlans,
      [],
      "a restart preserves deliberately unpublished plans",
    );
  } finally {
    await app.destroy();
    await rm(fixture, { recursive: true, force: true });
  }
});
