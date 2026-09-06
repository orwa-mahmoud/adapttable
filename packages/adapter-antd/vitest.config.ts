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
        // `lines` and `functions` are the honest floors for hand-written
        // code here. `statements` and `branches` sit lower because the React
        // Compiler compiles every component to a memo cache (`_c()` slots and
        // `if ($[i] !== x)` guards) whose cache-hit arm only runs on a
        // re-render with identical props, and because v8 fabricates branches
        // on JSX attributes and destructured defaults — a slot file is almost
        // entirely both.
        statements: 90,
        lines: 97,
        functions: 94,
        branches: 79,
      },
    },
  },
});
