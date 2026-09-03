import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Cold cssinjs + coverage instrumentation regularly lands the first
    // desktop Table test in the 35–45s range on a loaded machine. Shared
    // default is 30s; this package keeps the wider local/CI budget.
    testTimeout: 60_000,
    coverage: {
      exclude: ["src/test-utils.tsx"],
      thresholds: {
        statements: 85,
        lines: 95,
        functions: 85,
        branches: 78,
      },
    },
  },
});
