// Post-build sitemap repair. Three real-world GSC problems on GitHub Pages:
//   1. @astrojs/sitemap builds the landing loc as site+base WITHOUT a
//      trailing slash — that URL sits OUTSIDE the URL-prefix property
//      ("…/adapttable" vs the "…/adapttable/" scope GSC watches).
//   2. GSC has left the sitemap-index.xml + sitemap-0.xml pair in
//      "pending / never downloaded" limbo since Jun 16 — the widely
//      confirmed workaround is a FLAT, conventionally named sitemap.xml.
//   3. The demo pages are built by Vite in apps/showcase, not by Astro, so
//      the sitemap plugin never sees them. Six live, linked, indexable pages
//      were missing from the sitemap entirely — including /demo/editing/ and
//      /demo/grouping/, which the docs link to as "see it working".
// This emits dist/sitemap.xml (flat, slash-fixed, demo pages included)
// alongside the originals.
import { readFileSync, writeFileSync } from "node:fs";

import {
  indexableRoutes,
  routeCountFaults,
  SITE,
} from "../../scripts/sitemap-routes.mjs";
import { SHOWCASE_PAGES } from "../showcase/pages.mjs";
import { DOCS_VERSIONS } from "./versions.mjs";

/**
 * The demo routes, read from the manifest Vite builds the pages from
 * (`apps/showcase/pages.mjs`) — so a page cannot ship without appearing here,
 * and `indexable: false` entries such as the `/demo/export-pdf/` redirect stub
 * stay out on the manifest's own say-so.
 */
const DEMO_ROUTES = indexableRoutes(SHOWCASE_PAGES);

const dist = new URL("./dist/", import.meta.url);
let xml = readFileSync(new URL("sitemap-0.xml", dist), "utf8");
xml = xml.replaceAll(`<loc>${SITE}</loc>`, `<loc>${SITE}/</loc>`);

// slash-fixing the landing loc can duplicate an existing entry — dedupe by loc
const seen = new Set();
// Archived docs versions are noindex and stay out of every sitemap file.
const ARCHIVED = DOCS_VERSIONS.map(({ slug }) => `${SITE}/${slug}/`);
xml = xml.replace(/<url>.*?<\/url>/g, (block) => {
  const loc = /<loc>(.*?)<\/loc>/.exec(block)?.[1];
  if (loc && ARCHIVED.some((prefix) => loc.startsWith(prefix))) return "";
  if (seen.has(loc)) return "";
  seen.add(loc);
  return block;
});

// Append the Vite-built demo pages that Astro cannot know about.
const extra = DEMO_ROUTES.filter((p) => !seen.has(`${SITE}${p}`))
  .map((p) => {
    seen.add(`${SITE}${p}`);
    return `<url><loc>${SITE}${p}</loc></url>`;
  })
  .join("");
xml = xml.replace("</urlset>", `${extra}</urlset>`);

// Count what is about to ship, before it ships: every indexable route exactly
// one `<loc>`. Zero is the bug this file exists for; two would ask Google to
// pick between identical URLs. A fault here fails the docs build, so a sitemap
// that lost a route never reaches dist.
const faults = routeCountFaults(xml, SHOWCASE_PAGES);
if (faults.length > 0) {
  const detail = faults
    .map(({ route, count }) =>
      count === 0 ? `  ${route} — missing` : `  ${route} — listed ${count}×`
    )
    .join("\n");
  throw new Error(
    `fix-sitemap: sitemap.xml must list every indexable demo route from ` +
      `apps/showcase/pages.mjs exactly once:\n${detail}`
  );
}

writeFileSync(new URL("sitemap-0.xml", dist), xml);
writeFileSync(new URL("sitemap.xml", dist), xml);
console.log(
  `sitemap.xml written (flat, slash-fixed, ${seen.size} unique urls, ` +
    `${DEMO_ROUTES.length} demo pages)`
);
