import { mergeConfig } from "vitest/config";

import { sharedConfig } from "../../vitest.shared";

export default mergeConfig(sharedConfig, {
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // antd 6's cold cssinjs render is the slowest first paint in the repo
    // (see vitest.shared's CI note). When turbo runs every package's suite
    // at once — full gate or the forced sonar:coverage matrix — letting
    // this suite ALSO fan its files across worker threads oversubscribes
    // the cores enough that the first grouping test blows the per-test
    // budget (observed three times locally at ~35s vs the 30s limit;
    // deterministic solo). Run this package's files serially everywhere,
    // exactly as the shared config already does on CI.
    fileParallelism: false,
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
