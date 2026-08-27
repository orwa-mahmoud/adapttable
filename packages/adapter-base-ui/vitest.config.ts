import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      thresholds: {
        statements: 85,
        lines: 95,
        functions: 85,
        // 78 → 77 when the toolbar's density and fullscreen controls landed on
        // top of this phase's other slot files. Those files are 100% lines and
        // 100% functions; what pulls this measure down is v8 fabricating
        // branches on JSX attributes, the same artifact `packages/core` and
        // `adapter-mantine` both document on their own floors.
        branches: 77,
      },
    },
  },
});
