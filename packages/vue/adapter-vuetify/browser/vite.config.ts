import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [vue()],
  resolve: { dedupe: ["vue"] },
  build: {
    rollupOptions: {
      input: {
        table: fileURLToPath(new URL("./index.html", import.meta.url)),
        savedViews: fileURLToPath(
          new URL("./saved-views.html", import.meta.url)
        ),
      },
    },
  },
  server: { port: 5187, strictPort: true },
});
