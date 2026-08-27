import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    environment: "node",
    coverage: {
      thresholds: {
        statements: 99,
        lines: 99,
        functions: 99,
        branches: 95,
      },
    },
  },
});
