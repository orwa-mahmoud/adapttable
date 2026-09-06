import path from "node:path";
import { fileURLToPath } from "node:url";

import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(sharedConfig, {
  resolve: {
    alias: {
      "@adapttable/core": path.resolve(packageDir, "../core/src/index.ts"),
    },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      // Test scaffolding, not shipped code: no entry point exports these
      // slots and no build emits them. Classified the way core classifies its
      // own `chromeTestSlots.tsx`.
      exclude: ["src/internal/chromeTestSlots.tsx"],
      thresholds: {
        // This package is where the React Compiler runs hardest: every Chrome
        // component compiles to a memo cache (`_c()` slots and `if ($[i] !==
        // x)` guards), and the cache-hit arm of each guard only executes on a
        // re-render with identical props. v8 counts those arms as branches
        // and their bodies as statements, so a file at 100% lines still
        // reports in the eighties on both. `lines` and `functions` are the
        // honest floors for hand-written logic here; the other two are set
        // where the generated code leaves them.
        lines: 98,
        functions: 97,
        statements: 94,
        branches: 84,
      },
    },
  },
});
