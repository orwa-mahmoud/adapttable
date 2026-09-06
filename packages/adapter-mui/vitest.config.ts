import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // MUI 9's ESM (.mjs) imports react-transition-group through a directory
    // path Node's ESM resolver rejects under Vitest; inlining routes both
    // through Vitest's transform pipeline so the import resolves.
    server: { deps: { inline: [/@mui\//, /react-transition-group/] } },
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
        lines: 98,
        functions: 96,
        branches: 79,
      },
    },
  },
});
