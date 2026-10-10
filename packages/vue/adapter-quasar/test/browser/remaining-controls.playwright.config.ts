import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "remaining-controls.spec.ts",
  workers: 1,
  reporter: "line",
  outputDir: "../../node_modules/.remaining-controls-browser-results",
  use: { baseURL: "http://127.0.0.1:4394", browserName: "chromium" },
  webServer: {
    command:
      "node --experimental-strip-types test/browser/run-remaining-controls.ts",
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    url: "http://127.0.0.1:4394/test/browser/remaining-controls.html",
    reuseExistingServer: false,
  },
});
