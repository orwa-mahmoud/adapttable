import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
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
