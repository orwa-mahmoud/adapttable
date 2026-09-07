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
        statements: 97,
        branches: 92,
        functions: 97,
        lines: 98,
      },
    },
  },
});
