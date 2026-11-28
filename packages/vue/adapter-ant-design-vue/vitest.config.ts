import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

import {
  VITEST_TEST_TIMEOUT,
  vitestFileParallelism,
  vitestMaxWorkers,
} from "../../../scripts/vitest-workers.mjs";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    dedupe: ["vue"],
    alias: [
      {
        find: /^@adapttable\/core$/,
        replacement: fileURLToPath(
          new URL("../../shared/core/src/index.ts", import.meta.url)
        ),
      },
      {
        find: /^@adapttable\/core\/(.+)$/,
        replacement: fileURLToPath(
          new URL("../../shared/core/src/$1.ts", import.meta.url)
        ),
      },
      {
        find: /^@adapttable\/vue$/,
        replacement: fileURLToPath(
          new URL("../vue/src/index.ts", import.meta.url)
        ),
      },
      {
        find: /^@adapttable\/vue\/(.+)$/,
        replacement: fileURLToPath(
          new URL("../vue/src/$1.ts", import.meta.url)
        ),
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    pool: "threads",
    fileParallelism: vitestFileParallelism(),
    maxWorkers: vitestMaxWorkers(),
    testTimeout: VITEST_TEST_TIMEOUT,
    // Ant Design Vue's input defers a read of its inner ref with `nextTick`
    // after a change. A test that unmounts in the same tick as the change
    // reaches that read after the ref is cleared; the library throws, outside
    // any code the kit owns. Every other unhandled error still fails the run.
    onUnhandledError(error) {
      if (
        error.message.includes("reading 'input'") &&
        error.stack?.includes("vc-input/Input.js")
      )
        return false;
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts",
        "src/**/*.d.ts",
        "src/**/types.ts",
      ],
      thresholds: { statements: 96, branches: 90, functions: 95, lines: 97 },
    },
  },
});
