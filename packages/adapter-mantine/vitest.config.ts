import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      // CSS, the barrel, and the test harness carry no testable logic.
      exclude: ["src/**/*.css", "src/test-utils.tsx"],
      thresholds: {
        statements: 97,
        branches: 89,
        functions: 97,
        lines: 98,
      },
    },
  },
});
