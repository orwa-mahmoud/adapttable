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
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
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
      exclude: ["src/**/index.ts", "src/**/*.d.ts"],
      thresholds: { statements: 96, branches: 90, functions: 95, lines: 97 },
    },
  },
});
