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
    alias: [
      {
        find: /^@adapttable\/ai-vue$/,
        replacement: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      },
    ],
    dedupe: ["vue"],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
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
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
