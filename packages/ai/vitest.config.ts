import { fileURLToPath } from "node:url";

import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  resolve: {
    alias: {
      "@adapttable/ai/http": fileURLToPath(
        new URL("./src/http.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "jsdom",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/__snapshots__/**"],
      thresholds: {
        // `react.tsx` is measured here too, and it is a React component tree:
        // the React Compiler's generated memo cache (`_c()` slots and
        // `if ($[i] !== x)` guards) counts as statements and branches that
        // only run on a re-render with identical props. `lines` is the honest
        // floor for hand-written logic; the other three are set where the
        // generated code leaves them.
        statements: 96,
        lines: 98,
        functions: 97,
        branches: 91,
      },
    },
  },
});
