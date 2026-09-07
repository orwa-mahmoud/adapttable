import { fileURLToPath } from "node:url";

import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  resolve: {
    alias: {
      "@adapttable/ai/http": fileURLToPath(
        new URL("./src/http.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "jsdom",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/__snapshots__/**"],
      thresholds: {
        statements: 96,
        branches: 92,
        functions: 97,
        lines: 98,
      },
    },
  },
});
