import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared";

export default mergeConfig(sharedConfig, {
  test: {
    // Chakra's overlay Escape/dismiss tests flake under the full turbo
    // matrix (same oversubscription mechanism as antd — see the snag log
    // and vitest.shared's CI note). Run this package's files serially
    // everywhere, exactly as antd does; no timeout or assertion changes.
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
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
