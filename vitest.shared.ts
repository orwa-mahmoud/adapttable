import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import {
  vitestFileParallelism,
  vitestMaxWorkers,
} from "./scripts/vitest-workers.mjs";

/**
 * Shared Vitest configuration consumed by every package via
 * `mergeConfig(sharedConfig, { ... })`. Centralises the jsdom
 * environment, React plugin, and the coverage thresholds the whole
 * monorepo holds itself to (near-100%, enforced in CI).
 */
export const sharedConfig = defineConfig({
  // Run the React Compiler in the test build too (matching the shipped prod
  // build), so the memoization tests exercise the real compiled output. The
  // compiler's generated cache code (`_c()` slots, `if ($[i] !== x)`) reads as
  // "uncovered" branches/statements — that's machinery, not product logic, so
  // the thresholds below reflect logic coverage, not that generated code.
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset({ target: "18" })] }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    css: true,
    clearMocks: true,
    restoreMocks: true,
    // CI is 2-core and already shards packages across jobs — one worker.
    // Local turbo takes a slice per suite; a solo filter run uses half the
    // cores. See scripts/vitest-workers.mjs.
    fileParallelism: vitestFileParallelism(),
    maxWorkers: vitestMaxWorkers(),
    // Generous per-test budget for Ant Design's cold cssinjs first paint.
    // This only widens the time limit — assertions are unchanged.
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.gaps.test.{ts,tsx}",
        // Test scaffolding, not product code. Nothing exports these helpers,
        // nothing ships them, and measuring a harness measures the tests
        // rather than the kit.
        "src/**/*.test-utils.tsx",
        "src/**/index.ts",
        "src/**/*.d.ts",
        "src/**/types.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});

export default sharedConfig;
