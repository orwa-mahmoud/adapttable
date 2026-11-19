import { existsSync } from "node:fs";

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightVersions from "starlight-versions";

import { appendScript, guarded } from "../../scripts/analytics-guard.mjs";
import { demoRoute, docsSlug, ORIGIN, siteUrl } from "../../scripts/site.mjs";
import { analyticsTag, clarityTag } from "../../scripts/site-events.mjs";
import { siteNotices } from "../../scripts/site-notices.mjs";
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
  vite: {
    plugins: [
      siteNotices({
        // CSS from server-rendered components and Pagefind's generated assets
        // are published outside the client chunk graph.
        extraPackages: [
          { name: "astro" },
          { name: "@astrojs/starlight" },
          { name: "starlight-versions" },
          { name: "pagefind", via: "@astrojs/starlight" },
          { name: "@pagefind/default-ui", via: "@astrojs/starlight" },
        ],
      }),
    ],
  },
  integrations: [
    starlight({
      title: "AdaptTable",
      description:
        "React, Angular and Vue data tables with a framework-neutral engine, native UI-kit adapters and optional filtering, editing, pivoting and AI integration.",
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
              "React, Angular and Vue data tables with a headless framework-neutral engine and native UI-kit adapters. Optional URL state, filters, editing, virtualization, i18n and RTL.",
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
        // Google Analytics (GA4) and Microsoft Clarity, production builds
        // only, and only off localhost (the tags carry their own host guard).
        // They run alongside the Cloudflare beacon: the beacon stays the
        // cookieless baseline, GA4 adds funnel and event reporting.
        ...(IS_BUILD
          ? [
              { tag: "script", content: analyticsTag() },
              { tag: "script", content: clarityTag() },
            ]
          : []),
      ],
      customCss: ["./src/styles/custom.css"],
      components: {
        Footer: "./src/components/NoticesFooter.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        ThemeSelect: "./src/components/FrameworkThemeSelect.astro",
        SocialIcons: "./src/components/FrameworkSocialIcons.astro",
      },
      routeMiddleware: "./src/framework-route.ts",
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
