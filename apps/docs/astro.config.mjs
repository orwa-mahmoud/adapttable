import starlight from "@astrojs/starlight";
import starlightVersions from "starlight-versions";
import { appendScript, guarded } from "../../scripts/analytics-guard.mjs";
import { demoRoute, docsSlug, ORIGIN, siteUrl } from "../../scripts/site.mjs";
import { defineConfig } from "astro/config";
import { existsSync } from "node:fs";

import { sidebar } from "./sidebar.mjs";
import { CURRENT_VERSION_LABEL, DOCS_VERSIONS } from "./versions.mjs";

// starlight-versions snapshots the CURRENT docs into any listed version that
// has no folder, so a missing snapshot would ship this version's pages under
// an older label. Only scripts/archive-docs-version.mjs, which names the one
// version it is creating, may build without it.
for (const { slug } of DOCS_VERSIONS) {
  const snapshot = new URL(`./src/content/docs/${slug}/`, import.meta.url);
  if (!existsSync(snapshot) && process.env.ARCHIVE_DOCS_VERSION !== slug) {
    throw new Error(
      `docs version ${slug} has no snapshot in src/content/docs/${slug}/ — ` +
        `create it with scripts/archive-docs-version.mjs`
    );
  }
}

// Starlight injects `head` entries in dev as well as build, so analytics must
// be gated or local work reports itself as real traffic. `import.meta.env.PROD`
// is not available while this config is evaluated, so read the CLI command.
const IS_BUILD = process.argv.includes("build");

/**
 * The sidebar with each entry pointed at the section its page is served in —
 * `sidebar.mjs` names pages by their `docs/*.md` basename, and the doc-surface
 * gate holds it to `docs/` in those terms.
 */
const sectioned = (items) =>
  items.map((item) => {
    if ("items" in item) return { ...item, items: sectioned(item.items) };
    if ("slug" in item) return { ...item, slug: docsSlug(item.slug) };
    return item;
  });

// https://astro.build/config
export default defineConfig({
  site: ORIGIN,
  integrations: [
    starlight({
      title: "AdaptTable",
      description:
        "React data tables with a framework-neutral engine, native UI-kit adapters and optional features for filtering, editing, pivoting and AI integration.",
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
            url: siteUrl("/"),
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Any",
            license: "https://opensource.org/license/mit",
            programmingLanguage: "TypeScript",
            codeRepository: "https://github.com/orwa-mahmoud/adapttable",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        },
        // Cloudflare Web Analytics — cookieless, no consent banner needed.
        // Injected only off localhost, so a local run files no session.
        {
          tag: "script",
          content: guarded(
            appendScript(
              "https://static.cloudflareinsights.com/beacon.min.js",
              {
                defer: true,
                "data-cf-beacon":
                  '{"token": "dd71ff9f3b7b4064969d3f81e8c6ee9b"}',
              }
            )
          ),
        },
        // Google Analytics (GA4), production builds only, and only off
        // localhost. Runs alongside the Cloudflare beacon: the beacon stays
        // the cookieless baseline, GA4 adds funnel and event reporting. GA4
        // accepts hits from any host, so without the host guard a local
        // preview would report itself as a real visitor.
        ...(IS_BUILD
          ? [
              {
                tag: "script",
                content: guarded(
                  [
                    // googletagmanager.com serves the tag with
                    // `access-control-allow-origin: *`, so an anonymous fetch
                    // gives the browser full error detail instead of the
                    // opaque "Script error." cross-origin failures collapse
                    // into.
                    appendScript(
                      "https://www.googletagmanager.com/gtag/js?id=G-FT8LY7Z15Y",
                      { async: true, crossorigin: "anonymous" }
                    ),
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
                  ].join("\n")
                ),
              },
              // Microsoft Clarity session recording, behind the same guard:
              // a local run, a preview or an e2e pass must never record itself
              // as a session. The stub queues clarity() calls until the tag
              // loads.
              {
                tag: "script",
                content: guarded(
                  [
                    "  window.clarity = window.clarity || function () {",
                    "    (window.clarity.q = window.clarity.q || []).push(arguments);",
                    "  };",
                    appendScript("https://www.clarity.ms/tag/xxq9dbsjnj", {
                      async: true,
                    }),
                  ].join("\n")
                ),
              },
            ]
          : []),
      ],
      customCss: ["./src/styles/custom.css"],
      social: [
        {
          icon: "external",
          label: "Landing page",
          href: siteUrl("/"),
        },
        {
          icon: "rocket",
          label: "Live demo",
          href: siteUrl(demoRoute()),
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
      sidebar: sectioned(sidebar),
      plugins: [
        starlightVersions({
          current: { label: CURRENT_VERSION_LABEL },
          versions: DOCS_VERSIONS,
        }),
      ],
    }),
  ],
});
