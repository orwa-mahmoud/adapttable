import { defineConfig } from "vitest/config";

import {
  vitestFileParallelism,
  vitestMaxWorkers,
} from "../../../scripts/vitest-workers.mjs";

/**
 * `@adapttable/server` is the one package that does not build on
 * `vitest.shared.ts`. It has no React in its graph, so it needs neither the
 * React plugin nor the compiler pass — and its whole implementation lives in
 * `src/index.ts`, which the shared config excludes as a barrel. Inheriting
 * that exclusion would leave the package measuring nothing at all.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: vitestFileParallelism(),
    maxWorkers: vitestMaxWorkers(),
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.{test,spec}.ts", "src/**/*.d.ts"],
      // Node-only, no generated memo cache in the graph, so every metric is a
      // straight reading of the source.
      thresholds: {
        statements: 100,
        lines: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
