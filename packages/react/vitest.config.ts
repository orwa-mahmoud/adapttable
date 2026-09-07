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
        statements: 97,
        branches: 90,
        functions: 97,
        lines: 98,
      },
    },
  },
});
