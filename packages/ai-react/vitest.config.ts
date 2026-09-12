import { fileURLToPath } from "node:url";

import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  resolve: {
    alias: {
      // The HTTP bridge is read from source, the way the AI package reads it
      // in its own suite. A binding test that resolved the published subpath
      // would be checking the last build instead of the code beside it.
      "@adapttable/ai/http": fileURLToPath(
        new URL("../ai/src/http.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "jsdom",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}"],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
});
