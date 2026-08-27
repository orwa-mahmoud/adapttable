import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    environment: "node",
    coverage: {
      // The bin wrapper is a thin IO shell exercised via run().
      exclude: ["src/cli.ts"],
      thresholds: {
        statements: 99,
        lines: 99,
        functions: 99,
        branches: 95,
      },
    },
  },
});
