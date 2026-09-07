import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      exclude: ["src/test-utils.tsx"],
      thresholds: {
        statements: 96,
        branches: 91,
        functions: 97,
        lines: 98,
      },
    },
  },
});
