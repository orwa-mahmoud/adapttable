import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ["vue"] },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
