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
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.tsx", "src/__snapshots__/**"],
      thresholds: {
        statements: 99,
        lines: 99,
        functions: 99,
        branches: 95,
      },
    },
  },
});
