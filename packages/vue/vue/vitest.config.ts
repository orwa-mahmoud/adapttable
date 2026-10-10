import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

import {
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
        replacement: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      },
      {
        find: /^@adapttable\/vue\/(.+)$/,
        replacement: fileURLToPath(new URL("./src/$1.ts", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "jsdom",
    include: [
      "src/**/*.test.ts",
      "test/**/*.test.ts",
      "../adapter-vue-unstyled/test/actions-native*.test.ts",
      "../adapter-vue-unstyled/test/filter-header-inline.test.ts",
      "../adapter-vue-unstyled/test/filter-parts.test.ts",
      "../adapter-vue-unstyled/test/filter-chip-tree-ownership.test.ts",
      "../adapter-vue-unstyled/test/table-surfaces.test.ts",
      "../adapter-vue-unstyled/test/table-surface-ownership.test.ts",
      "../adapter-vue-unstyled/test/assistant-native.test.ts",
      "../adapter-vue-unstyled/test/assistant-examples.test.ts",
    ],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    pool: "threads",
    fileParallelism: vitestFileParallelism(),
    maxWorkers: vitestMaxWorkers(),
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/**/index.ts",
        "src/**/*.d.ts",
        "src/**/types.ts",
      ],
      thresholds: { statements: 97, branches: 90, functions: 97, lines: 98 },
    },
  },
});
