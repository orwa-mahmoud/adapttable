import { fileURLToPath } from "node:url";

import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

import {
  vitestFileParallelism,
  vitestMaxWorkers,
} from "../../../scripts/vitest-workers.mjs";

export default defineConfig({
  plugins: [
    vue(),
    ui({
      router: false,
      colorMode: false,
      dts: false,
      autoImport: false,
      components: false,
      prose: true,
    }),
  ],
  resolve: {
    dedupe: ["vue"],
    alias: [
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
    server: { deps: { inline: [/@nuxt\/ui/] } },
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
