import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "density.spec.ts",
  workers: 1,
  reporter: "line",
  outputDir: "../../node_modules/.density-toggle-tranche/browser-results",
  use: { baseURL: "http://127.0.0.1:4381", browserName: "chromium" },
  webServer: {
    command: "node --experimental-strip-types test/browser/run-density.ts",
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    url: "http://127.0.0.1:4381/test/browser/density.html",
    reuseExistingServer: false,
  },
});
