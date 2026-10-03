import path from "node:path";
import { fileURLToPath } from "node:url";

import angular from "@analogjs/vite-plugin-angular";
import { defineConfig } from "vitest/config";

import {
  vitestFileParallelism,
  vitestMaxWorkers,
} from "../../../scripts/vitest-workers.mjs";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

// The shared config carries the React plugin and the React Compiler; an
// Angular package compiles with Angular's own compiler instead, so it keeps
// the shared runner settings and coverage floors but not the plugins.
export default defineConfig({
  plugins: [angular({ tsconfig: path.join(packageDir, "tsconfig.spec.json") })],
  resolve: {
    alias: [
      {
        find: /^@adapttable\/angular-material$/,
        replacement: path.resolve(packageDir, "src/index.ts"),
      },
      {
        find: /^@adapttable\/angular-material\/(.+)$/,
        replacement: path.resolve(packageDir, "$1/index.ts"),
      },
      {
        find: /^@adapttable\/core$/,
        replacement: path.resolve(packageDir, "../../shared/core/src/index.ts"),
      },
      {
        find: /^@adapttable\/core\/(.+)$/,
        replacement: path.resolve(packageDir, "../../shared/core/src/$1.ts"),
      },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.test.ts",
      "row-reorder/**/*.test.ts",
      "assistant/**/*.test.ts",
    ],
    // Server rendering runs in Node without the browser testing platform.
    exclude: ["src/**/*.ssr.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    pool: "threads",
    fileParallelism: vitestFileParallelism(),
    maxWorkers: vitestMaxWorkers(),
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      include: [
        "assistant/**/*.ts",
        "cell-span/**/*.ts",
        "extra-rows/**/*.ts",
        "row-appearance/**/*.ts",
        "src/**/*.ts",
        "batch-editing/**/*.ts",
        "bulk-actions/**/*.ts",
        "cell-navigation/**/*.ts",
        "column-groups/**/*.ts",
        "column-menu/**/*.ts",
        "column-selection/**/*.ts",
        "command-palette/**/*.ts",
        "context-menu/**/*.ts",
        "density/**/*.ts",
        "editing/**/*.ts",
        "export/**/*.ts",
        "find-in-table/**/*.ts",
        "filters/**/*.ts",
        "fit-columns/**/*.ts",
        "fullscreen/**/*.ts",
        "grouping/**/*.ts",
        "grouping-panel/**/*.ts",
        "header-filters/**/*.ts",
        "multi-sort/**/*.ts",
        "nested-table/**/*.ts",
        "pinned-summary-rows/**/*.ts",
        "pivot/**/*.ts",
        "print/**/*.ts",
        "resizable-columns/**/*.ts",
        "row-actions/**/*.ts",
        "row-detail/**/*.ts",
        "row-pinning/**/*.ts",
        "row-reorder/**/*.ts",
        "saved-views/**/*.ts",
        "selection-stats/**/*.ts",
        "side-panel/**/*.ts",
        "status-bar/**/*.ts",
        "tree/**/*.ts",
        "virtualize/**/*.ts",
      ],
      exclude: [
        "assistant/**/*.test.ts",
        "src/**/*.test.ts",
        "src/**/index.ts",
        "row-reorder/**/*.test.ts",
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
