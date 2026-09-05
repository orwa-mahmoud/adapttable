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
  },
});
