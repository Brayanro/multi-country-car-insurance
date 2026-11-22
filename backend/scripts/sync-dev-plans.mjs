import { createRequire } from "node:module";
import { chmod, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const require = createRequire(import.meta.url);
const database = "/data/strapi.sqlite";
const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean" },
    apply: { type: "string" },
    "preserve-co-ruta-price": { type: "string" },
  },
});
const fingerprint = values.apply;
const dryRun = values["dry-run"] && fingerprint === undefined;
const apply = !values["dry-run"] && /^[a-f0-9]{64}$/.test(fingerprint ?? "");
if (
  process.env.QUOTE_DEV_CATALOG_MAINTENANCE !== "local-compose" ||
  (!dryRun && !apply)
) {
  throw new Error(
    "Run this maintenance command through scripts/sync-dev-plans.sh.",
  );
}

const secrets = JSON.parse(
  await readFile("/data/strapi-local-secrets.json", "utf8"),
);
Object.assign(process.env, secrets, { STRAPI_TELEMETRY_DISABLED: "true" });
const { createStrapi } = require("@strapi/strapi");
const SQLite = require("better-sqlite3");
const { syncDevPlans } = require("../dist/src/dev-plan-sync.js");

async function snapshot(target) {
  const source = new SQLite(database, { readonly: true, fileMustExist: true });
  try {
    await source.backup(target);
    await chmod(target, 0o600);
  } finally {
    source.close();
  }
}

async function run(filename, expectedFingerprint) {
  process.env.DATABASE_FILENAME = filename;
  const app = createStrapi({ appDir: resolve("."), distDir: resolve("dist") });
  app.config.set("quoteCatalogMaintenance", true);
  try {
    await app.load();
    return await syncDevPlans(
      app,
      expectedFingerprint,
      values["preserve-co-ruta-price"],
    );
  } finally {
    await app.destroy();
  }
}

function report(result) {
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "blocked" || result.status === "stale")
    process.exitCode = 1;
}

const workspace = await mkdtemp(join(tmpdir(), "quote-catalog-preview-"));
try {
  const copy = join(workspace, "strapi.sqlite");
  await snapshot(copy);
  const preview = await run(copy);
  if (dryRun || preview.status === "blocked") {
    report(preview);
  } else if (preview.fingerprint !== fingerprint) {
    report({ ...preview, status: "stale" });
  } else if (preview.status === "noop") {
    report(preview);
  } else {
    const backupDirectory = await mkdtemp("/data/.catalog-sync-backup-");
    await snapshot(join(backupDirectory, "strapi.sqlite"));
    console.log(
      `Saved pre-sync database backup at ${backupDirectory}/strapi.sqlite`,
    );
    report(await run(database, fingerprint));
  }
} finally {
  await rm(workspace, { recursive: true, force: true });
}
