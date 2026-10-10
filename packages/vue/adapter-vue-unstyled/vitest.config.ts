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
        find: /^@adapttable\/ai-vue$/,
        replacement: fileURLToPath(
          new URL("../ai-vue/src/index.ts", import.meta.url)
        ),
      },
      {
        find: /^@adapttable\/ai$/,
        replacement: fileURLToPath(
          new URL("../../shared/ai/src/index.ts", import.meta.url)
        ),
      },
      {
        find: /^@adapttable\/ai\/voice$/,
        replacement: fileURLToPath(
          new URL("../../shared/ai/src/voice.ts", import.meta.url)
        ),
      },
      {
        // Source tests use the same SFC style block without requiring dist.
        find: /^@adapttable\/vue-unstyled\/styles\.css$/,
        replacement:
          fileURLToPath(
            new URL("./src/filters/NativeFilterDialog.vue", import.meta.url)
          ) + "?vue&type=style&index=0&lang.css",
      },
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
      {
        find: /^@adapttable\/vue-unstyled$/,
        replacement: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      },
      {
        find: /^@adapttable\/vue-unstyled\/(.+)$/,
        replacement: fileURLToPath(new URL("./src/$1.ts", import.meta.url)),
      },
    ],
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
      thresholds: { statements: 96, branches: 90, functions: 95, lines: 97 },
    },
  },
});
