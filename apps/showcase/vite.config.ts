import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

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
      attrs: {
        async: true,
        // googletagmanager.com serves the tag with `access-control-allow-origin: *`,
        // so an anonymous fetch gives the browser full error detail instead of
        // the opaque "Script error." every cross-origin failure collapses into.
        crossorigin: "anonymous",
        src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
      },
      injectTo: "head",
    },
    {
      tag: "script",
      children: [
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
      ].join("\n"),
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
      children: [
        "window.clarity = window.clarity || function () {",
        "  (window.clarity.q = window.clarity.q || []).push(arguments);",
        "};",
      ].join("\n"),
      injectTo: "head",
    },
    {
      tag: "script",
      attrs: {
        async: true,
        src: `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`,
      },
      injectTo: "head",
    },
  ],
});

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
  plugins: [react(), tailwindcss(), googleAnalytics(), microsoftClarity()],
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
    alias: {
      // Longest key first: the bare "@adapttable/core" alias would otherwise
      // swallow the subpath and resolve ".../index.ts/adapter".
      "@adapttable/core/adapter": pkg("core", "adapter"),
      "@adapttable/core/xlsx": pkg("core", "xlsx"),
      "@adapttable/core/pdf": pkg("core", "pdf"),
      "@adapttable/core/sparkline": pkg("core", "sparkline"),
      "@adapttable/core/pivot": pkg("core", "pivot"),
      "@adapttable/core/formula": pkg("core", "formula"),
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
