import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    environment: "node",
    coverage: {
      // The bin wrapper is a thin IO shell exercised via run().
      exclude: ["src/cli.ts"],
      thresholds: {
        statements: 100,
        branches: 93,
        functions: 100,
        lines: 100,
      },
    },
  },
});
