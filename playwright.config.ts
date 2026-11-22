import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: process.env["QUOTE_BASE_URL"] ?? "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    channel:
      process.env["QUOTE_BROWSER_CHANNEL"] === "chrome" ? "chrome" : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
