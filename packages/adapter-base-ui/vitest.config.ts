import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      thresholds: {
        // `lines` and `functions` are the honest floors for hand-written
        // code here. `statements` and `branches` sit lower because the React
        // Compiler compiles every component to a memo cache (`_c()` slots and
        // `if ($[i] !== x)` guards) whose cache-hit arm only runs on a
        // re-render with identical props, and because v8 fabricates branches
        // on JSX attributes and destructured defaults — a slot file is almost
        // entirely both.
        statements: 89,
        lines: 98,
        functions: 95,
        branches: 79,
      },
    },
  },
});
