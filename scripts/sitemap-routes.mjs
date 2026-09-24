/**
 * Route arithmetic shared by the sitemap writer (`apps/docs/fix-sitemap.mjs`)
 * and the composed-site check (`scripts/check-sitemap.mjs`).
 *
 * Strings in, strings out: every caller does its own file reading, so this is
 * the layer the unit tests drive directly (`sitemap-routes.test.mjs`).
 */

import { ORIGIN } from "./site.mjs";

/**
 * The published site root — Astro's `site`, served from the origin's root.
 * Every `<loc>` in the sitemap starts with it.
 */
export const SITE = ORIGIN;

const LOC = /<loc>([^<]+)<\/loc>/g;

const META = /<meta\b[^>]*>/gi;

const HTTP_EQUIV_REFRESH = /http-equiv\s*=\s*["']?refresh/i;

/** Every `<loc>` value in a sitemap document, trimmed, in document order. */
export const locsIn = (xml) =>
  [...xml.matchAll(LOC)].map((match) => match[1].trim());

/**
 * The routes a page manifest asks the sitemap to carry, in manifest order.
 *
 * @param {{ route: string, indexable: boolean }[]} pages
 */
export const indexableRoutes = (pages) =>
  pages.filter((page) => page.indexable).map((page) => page.route);

/**
 * Indexable routes the sitemap does not list exactly once, as
 * `{ route, count }`. A count of 0 is a page no crawler can discover from the
 * sitemap; 2 or more is a duplicated `<url>` block. Neither is visible without
 * counting, which is why this returns the count rather than a boolean.
 *
 * @param {string} xml
 * @param {{ route: string, indexable: boolean }[]} pages
 * @param {string} [site]
 */
export const routeCountFaults = (xml, pages, site = SITE) => {
  const locs = locsIn(xml);
  return indexableRoutes(pages)
    .map((route) => ({
      route,
      count: locs.filter((loc) => loc === `${site}${route}`).length,
    }))
    .filter((entry) => entry.count !== 1);
};

/**
 * Whether a built page only forwards the reader somewhere else. A meta refresh
 * is the one redirect a static host can express, so it is the one to sniff —
 * and sniffing the HTML is what makes an UNREGISTERED stub safe: it is
 * excluded on its own evidence, never on being listed somewhere.
 */
export const isRedirectPage = (html) =>
  (html.match(META) ?? []).some((tag) => HTTP_EQUIV_REFRESH.test(tag));

/**
 * The public route a built file serves: `react/demo/columns/index.html`
 * becomes `/react/demo/columns/`. Takes a path relative to the composed site root, with
 * POSIX separators.
 */
export const routeForFile = (relPath) =>
  `/${relPath.replace(/index\.html$/, "")}`;
