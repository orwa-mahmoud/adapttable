import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      // Pure type-only modules (interfaces only) compile to nothing and
      // would otherwise report as 0% covered. `chromeTestSlots.tsx` is test
      // scaffolding rather than shipped code — it is exported from no entry
      // point — and is classified the way adapter-mui classifies its own
      // `src/test-utils.tsx`. Thresholds themselves do not move.
      exclude: [
        "src/source/TableSource.ts",
        "src/props.ts",
        "src/internal/chromeTestSlots.tsx",
      ],
      thresholds: {
        // The remaining statements gap is the React Compiler's generated cache
        // (`_c()` slots, `if ($[i] !== x)` guards): files at 100% lines still
        // report 77–90% statements because the cache-hit branch only runs on a
        // re-render with identical props. A handful of trivial source lines
        // (JSX closings, idle stubs) sit beside that. `lines` is the honest
        // floor for hand-written logic.
        statements: 96,
        lines: 99,
        functions: 99,
        // v8 coverage fabricates uncoverable "phantom" branches on object
        // literals, destructuring and JSX/SVG attributes — heavy in the shared
        // orchestration/rendering hoisted here from the adapters. Real coverage
        // stays high (statements/lines/functions above); branches is relaxed to
        // reflect that v8 artifact, not a gap in tests.
        branches: 80,
      },
    },
  },
});
