import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { appendScript, guarded } from "../../scripts/analytics-guard.mjs";
import { SHOWCASE_PAGES } from "./pages.mjs";

const GA_MEASUREMENT_ID = "G-FT8LY7Z15Y";

const CLARITY_PROJECT_ID = "xxq9dbsjnj";

/**
 * Inject Google Analytics (GA4) into every HTML entry.
 *
 * The showcase is a multi-page app, so this lives here rather than being
 * pasted into each `index.html` — one definition covers all eight pages and
 * any page added later. The docs site injects the same tag through Starlight's
 * `head` config. Microsoft Clarity below follows the identical pattern.
 */
const googleAnalytics = (): Plugin => ({
  name: "adapttable-google-analytics",
  // Production builds only. `transformIndexHtml` runs in dev too, and the
  // Playwright suite drives the dev server — every e2e run reported real
  // sessions against `localhost`, 332 of them in one day. Cloudflare drops
  // those because its beacon is bound to a hostname; GA4 accepts any host, so
  // it counted CI as traffic.
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "script",
      children: guarded(
        [
          // googletagmanager.com serves the tag with
          // `access-control-allow-origin: *`, so an anonymous fetch gives the
          // browser full error detail instead of the opaque "Script error."
          // every cross-origin failure collapses into.
          appendScript(
            `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
            { async: true, crossorigin: "anonymous" }
          ),
          "window.dataLayer = window.dataLayer || [];",
          "function gtag(){dataLayer.push(arguments);}",
          "gtag('js', new Date());",
          `gtag('config', '${GA_MEASUREMENT_ID}');`,
          "(function () {",
          "  function report(type, fatal) {",
          "    if (typeof gtag !== 'function') return;",
          "    gtag('event', 'web_exception', {",
          "      exception_type: type,",
          "      fatal: fatal,",
          "      non_interaction: true",
          "    });",
          "  }",
          "  window.addEventListener('error', function (event) {",
          "    var message = typeof event.message === 'string' ? event.message : '';",
          // ResizeObserver's benign loop notification arrives as an error event
          // with no error object. It gets its own bucket so the count stays
          // readable in GA4 instead of hiding inside a generic 'Error' total.
          "    if (message.startsWith('ResizeObserver loop')) {",
          "      report('ResizeObserverLoop', false);",
          "      return;",
          "    }",
          "    var error = event.error;",
          // Without an error object the message is the only identifying detail
          // GA4 will ever see, so send it instead of the blanket 'Error' —
          // truncated to the 100-character parameter limit. Only a real error
          // object marks the event fatal.
          "    var name = error && error.name ? error.name : '';",
          "    report(name || message.slice(0, 100) || 'Error', Boolean(error));",
          "  });",
          "  window.addEventListener('unhandledrejection', function (event) {",
          "    report(event.reason && event.reason.name ? event.reason.name : 'UnhandledRejection', false);",
          "  });",
          "})();",
        ].join("\n")
      ),
      injectTo: "head",
    },
  ],
});

/**
 * Inject Microsoft Clarity session recording into every HTML entry.
 *
 * Same shape and the same build-only gate as GA4 above, for the same reason:
 * the Playwright suite drives the dev server, and a recorder that loads there
 * would file every e2e run as a real visitor session. The stub queues
 * `clarity()` calls until the tag loads.
 */
const microsoftClarity = (): Plugin => ({
  name: "adapttable-microsoft-clarity",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "script",
      children: guarded(
        [
          "  window.clarity = window.clarity || function () {",
          "    (window.clarity.q = window.clarity.q || []).push(arguments);",
          "  };",
          appendScript(`https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`, {
            async: true,
          }),
        ].join("\n")
      ),
      injectTo: "head",
    },
  ],
});

/**
 * A real EventSource of patch ticks for the realtime page.
 *
 * The frames are just a clock — the demo's `parse` turns each tick into a
 * ranked budget patch so the row stays on page 1. GitHub Pages has no
 * server; the demo falls back to a scripted source with the same frames.
 */
const PATCH_STREAM_PATH = "/__adapttable/patches";
const PATCH_STREAM_INTERVAL_MS = 1200;

const patchStream = (): Plugin => ({
  name: "adapttable-patch-stream",
  configureServer(server) {
    server.middlewares.use(PATCH_STREAM_PATH, (req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const tick = () => {
        try {
          if (res.writableEnded || res.destroyed) {
            clearInterval(id);
            return;
          }
          res.write("data: tick\n\n");
        } catch {
          clearInterval(id);
        }
      };
      const id = setInterval(tick, PATCH_STREAM_INTERVAL_MS);
      const stop = () => clearInterval(id);
      req.on("close", stop);
      res.on("close", stop);
      res.on("error", stop);
      tick();
    });
  },
});

// Resolve each @adapttable/* package to its TypeScript source so the showcase
// always reflects the current library (and hot-reloads). The adapters are still
// the REAL ones — each section mounts a genuine kit component, never a mock.
const pkg = (rel: string, entry = "index", ext = "ts") =>
  fileURLToPath(
    new URL(`../../packages/${rel}/src/${entry}.${ext}`, import.meta.url)
  );

const page = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

/**
 * Resolve every `@adapttable/<pkg>/<feature>` subpath to its TypeScript source.
 *
 * The showcase runs against source so it always reflects the library, and each
 * kit now publishes one entry point per feature — which is exactly what the
 * demo imports to arm them. Listing those by hand meant a new import silently
 * resolved to `.../src/index.ts/<feature>` and broke the page, so the mapping
 * is derived: `enforce: "pre"` puts it ahead of the bare-package aliases that
 * would otherwise swallow the subpath.
 */
function adapttableSubpaths(): Plugin {
  return {
    name: "adapttable-source-subpaths",
    enforce: "pre",
    resolveId(id) {
      const match = /^@adapttable\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(id);
      if (!match) return null;
      const dir =
        match[1] === "core" ||
        match[1] === "ai" ||
        match[1] === "i18n" ||
        match[1] === "react"
          ? match[1]
          : `adapter-${match[1]}`;
      for (const ext of ["tsx", "ts"]) {
        const file = pkg(dir, match[2], ext);
        if (existsSync(file)) return file;
      }
      return null;
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [
    adapttableSubpaths(),
    react(),
    tailwindcss(),
    googleAnalytics(),
    microsoftClarity(),
    patchStream(),
  ],
  // Multi-page app: each demo page is its own static HTML entry, linked
  // with plain anchors — no client router, no GitHub Pages 404 tricks.
  build: {
    rollupOptions: {
      // Generated from `pages.mjs`, the manifest the docs sitemap and the
      // composed-site check read too. A page is registered once, there.
      input: Object.fromEntries(
        SHOWCASE_PAGES.map(({ key, html }) => [key, page(html)])
      ),
      // Vite 8/Rolldown: keep @mui and @emotion in their own chunk so
      // createBreakpoints cannot run before sortBreakpointsValues is
      // assigned. The previous cycle (`material-*.js` importing from
      // PageShell) threw `_t is not a function` on every production MUI
      // mount (`/?kit=mui`, Feature Lab → MUI).
      output: {
        codeSplitting: {
          groups: [
            {
              name: "mui",
              test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  resolve: {
    // Bare package names only, matched EXACTLY: a prefix alias would swallow
    // `@adapttable/mui/cell-navigation` and resolve `.../src/index.ts/…`.
    // Every subpath is resolved by `adapttableSubpaths` above, which derives
    // the file rather than listing 100-odd entries that go stale one import
    // at a time.
    alias: [
      { find: /^@adapttable\/core$/, replacement: pkg("core") },
      { find: /^@adapttable\/react$/, replacement: pkg("react") },
      { find: /^@adapttable\/ai$/, replacement: pkg("ai") },
      { find: /^@adapttable\/i18n$/, replacement: pkg("i18n") },
      { find: /^@adapttable\/mantine$/, replacement: pkg("adapter-mantine") },
      { find: /^@adapttable\/mui$/, replacement: pkg("adapter-mui") },
      { find: /^@adapttable\/chakra$/, replacement: pkg("adapter-chakra") },
      { find: /^@adapttable\/unstyled$/, replacement: pkg("adapter-unstyled") },
      { find: /^@adapttable\/shadcn$/, replacement: pkg("adapter-shadcn") },
      { find: /^@adapttable\/antd$/, replacement: pkg("adapter-antd") },
      { find: /^@adapttable\/radix$/, replacement: pkg("adapter-radix") },
      { find: /^@adapttable\/base-ui$/, replacement: pkg("adapter-base-ui") },
    ],
    dedupe: [
      "react",
      "react-dom",
      "@mui/material",
      "@mui/system",
      "@emotion/react",
      "@emotion/styled",
    ],
  },
});
