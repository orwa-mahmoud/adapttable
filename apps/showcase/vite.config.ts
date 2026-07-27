import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Resolve each @adapttable/* package to its TypeScript source so the showcase
// always reflects the current library (and hot-reloads). The adapters are still
// the REAL ones — each section mounts a genuine kit component, never a mock.
const pkg = (rel: string, entry = "index") =>
  fileURLToPath(
    new URL(`../../packages/${rel}/src/${entry}.ts`, import.meta.url)
  );

const page = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  // Multi-page app: each demo page is its own static HTML entry, linked
  // with plain anchors — no client router, no GitHub Pages 404 tricks.
  build: {
    rollupOptions: {
      input: {
        main: page("./index.html"),
        columns: page("./columns/index.html"),
        editing: page("./editing/index.html"),
        grouping: page("./grouping/index.html"),
        scale: page("./scale/index.html"),
        rtl: page("./rtl/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      // Longest key first: the bare "@adapttable/core" alias would otherwise
      // swallow the subpath and resolve ".../index.ts/adapter".
      "@adapttable/core/adapter": pkg("core", "adapter"),
      "@adapttable/core": pkg("core"),
      "@adapttable/mantine": pkg("adapter-mantine"),
      "@adapttable/mui": pkg("adapter-mui"),
      "@adapttable/chakra": pkg("adapter-chakra"),
      "@adapttable/unstyled": pkg("adapter-unstyled"),
      "@adapttable/shadcn": pkg("adapter-shadcn"),
      "@adapttable/antd": pkg("adapter-antd"),
      "@adapttable/radix": pkg("adapter-radix"),
      "@adapttable/base-ui": pkg("adapter-base-ui"),
      "@adapttable/i18n": pkg("i18n"),
    },
    dedupe: ["react", "react-dom"],
  },
});
