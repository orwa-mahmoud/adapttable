import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      thresholds: {
        statements: 97,
        branches: 96,
        functions: 93,
        lines: 96,
      },
    },
  },
});
