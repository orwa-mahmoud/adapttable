import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
    // `turbo` already runs every package's suite in parallel, so the aggregate
    // thread count is what matters, not one suite's. Letting each vitest ALSO
    // fan its files across worker threads oversubscribes the cores several
    // times over — on the 2-core CI runner and equally on a 10-core laptop
    // running ten suites at once — and antd 6's cold cssinjs render (paid once,
    // by the first test of the suite) blows past the per-test timeout under
    // that thrash. One thread per suite keeps the total near the core count and
    // makes the full gate deterministic.
    fileParallelism: false,
    // Generous per-test budget for that same cold first render on a loaded CI
    // runner. This only widens the time limit — assertions are unchanged.
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.gaps.test.{ts,tsx}",
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
