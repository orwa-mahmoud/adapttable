/**
 * The showcase page manifest — the one list of demo pages this repo keeps.
 *
 * Three consumers read it and nothing else:
 *   - `apps/showcase/vite.config.ts` generates `rollupOptions.input` from it,
 *     so an entry here is a page that ships.
 *   - `apps/docs/fix-sitemap.mjs` generates the showcase URLs of
 *     `dist/sitemap.xml` from the indexable entries, and fails the docs build
 *     if one of them is not listed exactly once.
 *   - `scripts/check-sitemap.mjs` walks the composed site and fails when a
 *     built demo page is missing from that sitemap.
 *
 * One entry here is therefore the whole registration: the page builds, it is
 * crawlable, and the checks that prove both read the same line. Two separate
 * lists is how nine live pages — filtering, tree, selection, pagination,
 * accessibility, realtime, pivot, saved views and the Feature Lab — stayed out
 * of the sitemap while the docs linked to them as "see it working".
 *
 * Most of the list is no longer written here. The demo is adapter-first: every
 * built adapter gets a landing page and one page per feature, and those come
 * from `matrix.mjs` by expansion. Adding a feature there adds it to the build,
 * the sitemap, the nav and the checks at once.
 *
 * @typedef {object} ShowcasePage
 * @property {string} key Rollup input name, and the basename Vite gives the
 *   page's chunk and CSS asset.
 * @property {string} html HTML entry, relative to the showcase package root —
 *   where this file and `vite.config.ts` both sit.
 * @property {string} route Public path on the composed site, which serves the
 *   showcase under `DEMO_ROOT` (`scripts/site.mjs`). Trailing slash always: that is the form Pages
 *   serves a directory index at, and the form the sitemap has to carry.
 * @property {boolean} indexable Whether the route belongs in the sitemap. A
 *   page that must build but must never be indexed sets `false`. Redirect
 *   stubs use that because listing one asks a crawler to index a URL whose
 *   whole content is "the page is elsewhere". A kit/e2e lab that is not a
 *   marketing tile uses it too and still boots a bundle.
 * @property {string | null} framework The framework whose entry the page
 *   boots — for a matrix page, the framework its adapter's kit is built on —
 *   or `null` for a page that boots no bundle.
 */

import { demoRoute } from "../../scripts/site.mjs";
import { matrixPages } from "./matrix.mjs";

/** The framework the showcase's own pages — landing, labs — are written in. */
const SHOWCASE_FRAMEWORK = "react";

/**
 * A demo whose directory name is also its key and its route segment — every
 * page except the landing page.
 *
 * @param {string} dir
 * @param {{ indexable?: boolean, framework?: string | null }} [options]
 * @returns {ShowcasePage}
 */
const demo = (
  dir,
  { indexable = true, framework = SHOWCASE_FRAMEWORK } = {}
) => ({
  key: dir.replaceAll("/", "-"),
  html: `./${dir}/index.html`,
  route: demoRoute(dir),
  indexable,
  framework,
});

/**
 * The addresses a feature page used to answer at, and where it answers now.
 *
 * These were live and linked before the demo became adapter-first, so each
 * keeps a static meta-refresh stub at its old address. A stub carries no bundle
 * and stays out of the sitemap: asking a crawler to index a page whose whole
 * content is "this is elsewhere" competes with the page it points at.
 *
 * The other feature pages this restructure replaced were never published, so
 * they are simply gone — a redirect from an address nobody has is noise.
 *
 * @type {readonly [string, string][]}
 */
export const REPLACED_PAGES = [
  ["columns", "mantine/columns"],
  ["editing", "mantine/editing"],
  ["export", "mantine/export"],
  // The export demo's first address, which already forwarded to `export/`
  // — pointed at the live page rather than at another stub, because a chain of
  // two refreshes is two chances to lose the reader.
  ["export-pdf", "mantine/export"],
  ["grouping", "mantine/grouping"],
  ["mobile", "mantine/mobile-cards"],
  ["rtl", "mantine/rtl"],
  ["scale", "mantine/scale"],
];

/**
 * Alphabetical after the landing page, which is the section root.
 *
 * @type {ShowcasePage[]}
 */
export const SHOWCASE_PAGES = [
  {
    key: "main",
    html: "./index.html",
    route: demoRoute(),
    indexable: true,
    framework: SHOWCASE_FRAMEWORK,
  },
  demo("all-options"),
  // Optional AI chrome — built for kit/e2e coverage, not a marketing tile.
  demo("agent-approval", { indexable: false }),
  // The view an MCP host embeds in an iframe. Built so the handshake and the
  // tools/call path are exercisable; not a page anybody browses to.
  demo("mcp-app", { indexable: false }),
  // The adapter × feature matrix — a landing plus the matrix feature pages per
  // built adapter, expanded from `matrix.mjs`.
  ...matrixPages().map((page) => demo(page.dir, { framework: page.framework })),
  // The addresses those pages replaced — static redirects with no bundle.
  ...REPLACED_PAGES.map(([from]) =>
    demo(from, { indexable: false, framework: null })
  ),
];
