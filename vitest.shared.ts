import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { createInstrumenter } from "istanbul-lib-instrument";
import { defineConfig, type Plugin } from "vitest/config";

import {
  vitestFileParallelism,
  vitestMaxWorkers,
} from "./scripts/vitest-workers.mjs";

/**
 * Shared Vitest configuration consumed by every package via
 * `mergeConfig(sharedConfig, { ... })`. Centralises the jsdom
 * environment, React plugin, and the coverage thresholds the whole
 * monorepo holds itself to (near-100%, enforced in CI).
 *
 * Coverage counts the source. The counters are attached by Babel before the
 * React Compiler transforms the file, so a percentage here is a statement or
 * branch someone wrote, and the tests still run against the compiled output
 * the build ships.
 */

/** The product sources coverage measures, shared by the instrumenter. */
const coverageInclude = ["src/**/*.{ts,tsx}"];

/**
 * Files that are never product code: the tests themselves, their helpers, and
 * declaration-only modules that compile to nothing.
 */
const coverageExclude = [
  "src/**/*.{test,spec}.{ts,tsx}",
  "src/**/*.gaps.test.{ts,tsx}",
  "src/**/*.test-utils.tsx",
  "src/**/index.ts",
  "src/**/*.d.ts",
  "src/**/types.ts",
];

/**
 * Counters are written straight into Vitest's own coverage store, so the
 * istanbul provider collects them without instrumenting a second time.
 */
const istanbulPluginOptions = {
  coverageVariable: "__VITEST_COVERAGE__",
  coverageGlobalScope: "globalThis",
  coverageGlobalScopeFunc: false,
  extension: [".ts", ".tsx"],
  include: coverageInclude,
  exclude: coverageExclude,
};

/**
 * Whether this run is collecting coverage.
 *
 * Instrumenting rewrites the code under test, so it is installed only when
 * coverage was asked for: a plain `vitest run` executes the compiler's own
 * output, byte for byte what the build ships. Vitest exposes no environment
 * flag for this, so the request is read from the command line and
 * {@link coverageGate} fails the run if that reading is ever wrong.
 */
function coverageRequested(argv: readonly string[]): boolean {
  let requested = false;
  for (const arg of argv) {
    if (arg === "--coverage" || arg === "--coverage.enabled") requested = true;
    else if (arg.startsWith("--coverage.enabled="))
      requested = !arg.endsWith("=false");
  }
  return requested;
}

const collectingCoverage = coverageRequested(process.argv);

/**
 * Stops the two halves of the decision above drifting apart.
 *
 * A run that collects coverage without the counters reports zero and reads
 * as a broken suite; a run that installs them without collecting measures
 * nothing and tests something other than the shipped output. Both are
 * silent, so both stop the run here instead.
 */
function coverageGate(): Plugin {
  return {
    name: "adapttable:coverage-gate",
    // Vite's resolved config still holds the file's own `test` block, so the
    // comparison is made against Vitest's, which has the command line in it.
    configureVitest({ project }) {
      const enabled = project.config.coverage.enabled;
      if (enabled === collectingCoverage) return;
      throw new Error(
        enabled
          ? "Coverage is enabled but the instrumentation is not installed. " +
              "Ask for it on the command line: `vitest run --coverage`."
          : "Coverage instrumentation is installed but coverage is off. " +
              "Drop `--coverage` from the command, or enable coverage with it."
      );
    },
  };
}

/**
 * Vitest instruments in a `post` Vite plugin, which would read the React
 * Compiler's output rather than the source. The Babel pass below has already
 * attached the counters, so this hands the code back untouched and stays the
 * only instrumenter.
 *
 * The delegate exists for files no test imports: Vitest asks the instrumenter
 * for their shape so they land in the report at zero rather than vanishing.
 */
function passthroughInstrumenter(options: {
  coverageVariable: string;
  coverageGlobalScope: string;
  coverageGlobalScopeFunc: boolean;
  ignoreClassMethods?: string[];
}) {
  const shapeOnly = createInstrumenter({
    ...options,
    produceSourceMap: false,
    autoWrap: false,
    esModules: true,
  });
  return {
    instrumentSync(code: string, filename: string) {
      shapeOnly.instrumentSync(code, filename);
      return code;
    },
    lastSourceMap: () => undefined,
    lastFileCoverage: () => shapeOnly.lastFileCoverage(),
  };
}

export const sharedConfig = defineConfig({
  // Run the React Compiler in the test build too (matching the shipped prod
  // build), so the memoization tests exercise the real compiled output.
  plugins: [
    coverageGate(),
    react(),
    babel({
      // Babel runs plugins before presets, so on a coverage run the counters
      // are attached to the source constructs and the React Compiler then
      // memoizes the instrumented code: the percentages read the source
      // while the tests still exercise compiled output. Without `--coverage`
      // the array is empty and the compiler is the only pass.
      plugins: collectingCoverage ? [["istanbul", istanbulPluginOptions]] : [],
      presets: [reactCompilerPreset({ target: "18" })],
    }),
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
    // Threads over the default forks: nearly all of a suite's wall time is
    // module loading, and a thread pool pays that once per worker instead of
    // once per forked process. Per-file isolation is unchanged — measured
    // 8–15% faster on core, react and the kits, with every suite still green.
    pool: "threads",
    fileParallelism: vitestFileParallelism(),
    maxWorkers: vitestMaxWorkers(),
    // Generous per-test budget for Ant Design's cold cssinjs first paint.
    // This only widens the time limit — assertions are unchanged.
    testTimeout: 30000,
    coverage: {
      provider: "istanbul",
      instrumenter: passthroughInstrumenter,
      reporter: ["text", "lcov", "html"],
      include: coverageInclude,
      // Test scaffolding is not product code. Nothing exports these helpers,
      // nothing ships them, and measuring a harness measures the tests
      // rather than the kit.
      exclude: coverageExclude,
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
