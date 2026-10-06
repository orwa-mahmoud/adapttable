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
    ],
  },
  test: {
    environment: ssr ? "node" : "jsdom",
    setupFiles: ssr ? [] : ["./test/setup.ts"],
    include: ssr ? ["test/**/*.ssr.test.ts"] : ["test/**/*.test.ts"],
    exclude: ssr ? [] : ["test/**/*.ssr.test.ts"],
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
