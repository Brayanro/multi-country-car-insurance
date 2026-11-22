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

test("US-01 T-US01-05/08/09 · US01-R03/R05: publish, change and unpublish an isolated CMS fixture", async () => {
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
    assert.deepEqual(await roleActions("public"), [readPermission]);
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
    assert.deepEqual(await roleActions("public"), [readPermission]);
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
  } finally {
    await app.destroy();
    await rm(fixture, { recursive: true, force: true });
  }
});
