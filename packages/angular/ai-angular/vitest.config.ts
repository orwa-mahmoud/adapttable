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
        find: /^@adapttable\/ai$/,
        replacement: path.resolve(packageDir, "../../shared/ai/src/index.ts"),
      },
      {
        find: "@adapttable/ai/ag-ui",
        replacement: path.resolve(packageDir, "../../shared/ai/src/agui.ts"),
      },
      {
        find: "@adapttable/ai/ai-sdk",
        replacement: path.resolve(packageDir, "../../shared/ai/src/aiSdk.ts"),
      },
      {
        find: "@adapttable/ai/mcp-apps",
        replacement: path.resolve(packageDir, "../../shared/ai/src/mcpApps.ts"),
      },
      {
        find: /^@adapttable\/ai\/(.+)$/,
        replacement: path.resolve(packageDir, "../../shared/ai/src/$1.ts"),
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
    include: ["src/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    pool: "threads",
    fileParallelism: vitestFileParallelism(),
    maxWorkers: vitestMaxWorkers(),
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.fixture.ts", "src/index.ts"],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
