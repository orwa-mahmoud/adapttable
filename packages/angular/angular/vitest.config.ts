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
      // The router entry reaches the primary entry by package name, as
      // ng-packagr requires; tests resolve it to source.
      {
        find: /^@adapttable\/angular$/,
        replacement: path.resolve(packageDir, "src/index.ts"),
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
      "router/**/*.test.ts",
      "stream/**/*.test.ts",
      "formula/**/*.test.ts",
      "pivot/**/*.test.ts",
      "sparkline/**/*.test.ts",
    ],
    clearMocks: true,
    restoreMocks: true,
    pool: "threads",
    fileParallelism: vitestFileParallelism(),
    maxWorkers: vitestMaxWorkers(),
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      include: [
        "src/**/*.ts",
        "router/**/*.ts",
        "stream/**/*.ts",
        "formula/**/*.ts",
        "pivot/**/*.ts",
        "sparkline/**/*.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts",
        "router/**/*.test.ts",
        "router/index.ts",
        "stream/**/*.test.ts",
        "stream/index.ts",
        "formula/**/*.test.ts",
        "formula/index.ts",
        "pivot/**/*.test.ts",
        "pivot/index.ts",
        "sparkline/**/*.test.ts",
        "sparkline/index.ts",
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
