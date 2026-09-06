import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    environment: "node",
    coverage: {
      // The bin wrapper is a thin IO shell exercised via run().
      exclude: ["src/cli.ts"],
      thresholds: {
        // Two `?? []` fallbacks guard lookups whose keys come from the map
        // being read, so no input reaches them; every other branch is held.
        statements: 100,
        lines: 100,
        functions: 100,
        branches: 97,
      },
    },
  },
});
