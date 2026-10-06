import { fileURLToPath } from "node:url";

import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const ssr = process.env.ADAPTTABLE_QUASAR_SSR === "1";

export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    ...(ssr ? [] : [quasar()]),
  ],
  resolve: {
    dedupe: ["vue"],
    alias: [
      ...(ssr
        ? [
            {
              find: /^quasar$/,
              replacement: fileURLToPath(
                import.meta.resolve("quasar/dist/quasar.server.prod.js")
              ),
            },
          ]
        : []),
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
    environment: ssr ? "node" : "jsdom",
    setupFiles: ssr ? [] : ["./test/setup.ts"],
    include: ssr ? ["test/controls.ssr.test.ts"] : ["test/controls.test.ts"],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts", "src/**/*.vue"],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
