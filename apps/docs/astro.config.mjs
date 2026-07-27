import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

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
      sidebar: [
        {
          label: "Start",
          items: [
            { label: "Getting started", slug: "getting-started" },
            { label: "Concepts", slug: "concepts" },
            { label: "Data tiers", slug: "data-tiers" },
          ],
        },
        {
          label: "Features",
          items: [
            { label: "Columns", slug: "columns" },
            { label: "Sorting", slug: "sorting" },
            { label: "Filtering", slug: "filtering" },
            { label: "Pagination", slug: "pagination" },
            { label: "Selection & bulk actions", slug: "selection" },
            { label: "Row expansion", slug: "row-expansion" },
            { label: "Inline cell editing", slug: "cell-editing" },
            { label: "Row grouping", slug: "row-grouping" },
            { label: "Column management", slug: "column-management" },
            { label: "Saved views", slug: "saved-views" },
            { label: "Virtualization", slug: "virtualization" },
          ],
        },
        {
          label: "Beyond the table",
          items: [
            { label: "URL state", slug: "url-state" },
            { label: "Customization", slug: "customization" },
            { label: "i18n & RTL", slug: "i18n-rtl" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "API reference", slug: "api" },
            { label: "FAQ", slug: "faq" },
            { label: "Comparison", slug: "comparison" },
            { label: "Versioning & stability", slug: "versioning" },
          ],
        },
        {
          label: "Migrating",
          items: [
            {
              label: "From AdaptTable v1",
              slug: "migrate-from-v1",
            },
            {
              label: "From mantine-datatable",
              slug: "migrate-from-mantine-datatable",
            },
            {
              label: "From MUI X DataGrid",
              slug: "migrate-from-mui-x-datagrid",
            },
            {
              label: "From TanStack Table",
              slug: "migrate-from-tanstack-table",
            },
            {
              label: "From mui-datatables",
              slug: "migrate-from-mui-datatables",
            },
            {
              label: "From material-table",
              slug: "migrate-from-material-table",
            },
            {
              label: "From ag-Grid",
              slug: "migrate-from-ag-grid",
            },
          ],
        },
      ],
    }),
  ],
});
