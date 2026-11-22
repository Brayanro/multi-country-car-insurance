import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const database = resolve(
  process.env.DATABASE_FILENAME ?? ".data/strapi.sqlite",
);
const dataDirectory = dirname(database);
const secretFile = join(dataDirectory, "strapi-local-secrets.json");
mkdirSync(dataDirectory, { recursive: true });
const secret = () => randomBytes(32).toString("base64url");
try {
  writeFileSync(
    secretFile,
    JSON.stringify({
      APP_KEYS: [secret(), secret(), secret(), secret()].join(","),
      ADMIN_JWT_SECRET: secret(),
      API_TOKEN_SALT: secret(),
      TRANSFER_TOKEN_SALT: secret(),
      JWT_SECRET: secret(),
      ENCRYPTION_KEY: secret(),
    }),
    { mode: 0o600, flag: "wx" },
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
const environment = JSON.parse(readFileSync(secretFile, "utf8"));
const directory = dirname(require.resolve("@strapi/strapi/package.json"));
const command = process.argv[2] === "develop" ? "develop" : "start";
const args = [join(directory, "bin/strapi.js"), command];
if (command === "develop") args.push("--no-open", "--no-install-deps");
const server = spawn(process.execPath, args, {
  env: { ...environment, ...process.env, DATABASE_FILENAME: database },
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.kill(signal));
server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
