import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls } }), quasar()],
  resolve: { dedupe: ["vue"] },
  server: { host: "127.0.0.1", port: 4382, strictPort: true },
  build: {
    target: "esnext",
    rollupOptions: { input: "test/browser/export.html" },
    outDir: "node_modules/.export-tranche/browser-dist",
  },
});
