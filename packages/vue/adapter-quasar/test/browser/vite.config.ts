import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls } }), quasar()],
  resolve: { dedupe: ["vue"] },
  build: {
    rollupOptions: { input: "test/browser/column-menu.html" },
    outDir: "node_modules/.column-menu-tranche/browser-dist",
  },
});
