import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

import { sidebar } from "./sidebar.mjs";

// Starlight injects `head` entries in dev as well as build, so analytics must
// be gated or local work reports itself as real traffic. `import.meta.env.PROD`
// is not available while this config is evaluated, so read the CLI command.
const IS_BUILD = process.argv.includes("build");

// https://astro.build/config
export default defineConfig({
  site: "https://orwa-mahmoud.github.io",
  base: "/adapttable",
  integrations: [
    starlight({
      title: "AdaptTable",
      description:
        "One headless React data-table engine, native adapters for Mantine, MUI, Chakra, Ant Design, Radix, Base UI and Tailwind/shadcn.",
      head: [
        // Social-share image is per-page (PNG, 1200x630): sync-docs injects a
        // distinct og:image/twitter:image into each page's frontmatter `head`.
        // These globals just declare the shared card dimensions and type.
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        {
          tag: "meta",
          attrs: { name: "twitter:card", content: "summary_large_image" },
        },
        {
          tag: "meta",
          attrs: {
            name: "robots",
            content: "index, follow, max-image-preview:large",
          },
        },
        // Entity data for search engines and answer engines.
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "AdaptTable",
            description:
              "Headless, UI-agnostic React data table with native adapters for Mantine, MUI, Chakra UI, Ant Design, Radix, Base UI and Tailwind/shadcn — URL-synced state, declarative filters, column management, virtualization, i18n and RTL.",
            url: "https://orwa-mahmoud.github.io/adapttable/",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Any",
            license: "https://opensource.org/license/mit",
            programmingLanguage: "TypeScript",
            codeRepository: "https://github.com/orwa-mahmoud/adapttable",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        },
        // Cloudflare Web Analytics — cookieless, no consent banner needed.
        {
          tag: "script",
          attrs: {
            defer: true,
            src: "https://static.cloudflareinsights.com/beacon.min.js",
            "data-cf-beacon": '{"token": "dd71ff9f3b7b4064969d3f81e8c6ee9b"}',
          },
        },
        // Google Analytics (GA4), production builds only. Runs alongside the
        // Cloudflare beacon: the beacon stays the cookieless baseline, GA4
        // adds funnel and event reporting. Unlike the beacon — which is bound
        // to a hostname and drops anything that is not the real site — GA4
        // accepts hits from any host, so a dev server would report itself.
        ...(IS_BUILD
          ? [
              {
                tag: "script",
                attrs: {
                  async: true,
                  // googletagmanager.com serves the tag with
                  // `access-control-allow-origin: *`, so an anonymous fetch
                  // gives the browser full error detail instead of the opaque
                  // "Script error." every cross-origin failure collapses into.
                  crossorigin: "anonymous",
                  src: "https://www.googletagmanager.com/gtag/js?id=G-FT8LY7Z15Y",
                },
              },
              {
                tag: "script",
                content: [
                  "window.dataLayer = window.dataLayer || [];",
                  "function gtag(){dataLayer.push(arguments);}",
                  "gtag('js', new Date());",
                  "gtag('config', 'G-FT8LY7Z15Y');",
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
                  // ResizeObserver's benign loop notification arrives as an
                  // error event with no error object. It gets its own bucket so
                  // the count stays readable in GA4 instead of hiding inside a
                  // generic 'Error' total.
                  "    if (message.startsWith('ResizeObserver loop')) {",
                  "      report('ResizeObserverLoop', false);",
                  "      return;",
                  "    }",
                  "    var error = event.error;",
                  // Without an error object the message is the only identifying
                  // detail GA4 will ever see, so send it instead of the blanket
                  // 'Error' — truncated to the 100-character parameter limit.
                  // Only a real error object marks the event fatal.
                  "    var name = error && error.name ? error.name : '';",
                  "    report(name || message.slice(0, 100) || 'Error', Boolean(error));",
                  "  });",
                  "  window.addEventListener('unhandledrejection', function (event) {",
                  "    report(event.reason && event.reason.name ? event.reason.name : 'UnhandledRejection', false);",
                  "  });",
                  "})();",
                ].join("\n"),
              },
              // Microsoft Clarity session recording, behind the same gate:
              // a dev server or an e2e run must never record itself as a
              // session. The stub queues clarity() calls until the tag loads.
              {
                tag: "script",
                content: [
                  "window.clarity = window.clarity || function () {",
                  "  (window.clarity.q = window.clarity.q || []).push(arguments);",
                  "};",
                ].join("\n"),
              },
              {
                tag: "script",
                attrs: {
                  async: true,
                  src: "https://www.clarity.ms/tag/xxq9dbsjnj",
                },
              },
            ]
          : []),
      ],
      customCss: ["./src/styles/custom.css"],
      social: [
        {
          icon: "external",
          label: "Landing page",
          href: "https://orwa-mahmoud.github.io/adapttable/",
        },
        {
          icon: "rocket",
          label: "Live demo",
          href: "https://orwa-mahmoud.github.io/adapttable/demo/",
        },
        {
          icon: "npm",
          label: "npm",
          href: "https://www.npmjs.com/org/adapttable",
        },
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/orwa-mahmoud/adapttable",
        },
      ],
      sidebar,
    }),
  ],
});
