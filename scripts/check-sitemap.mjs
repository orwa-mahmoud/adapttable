#!/usr/bin/env node
/**
 * Verify the COMPOSED site lists every demo page it actually ships.
 *
 * The docs site (Astro) and the showcase (Vite) build separately and are then
 * copied together — showcase `dist` into `apps/docs/dist/react/demo`. The deployable
 * tree exists only after that copy, so only then can the sitemap be compared
 * with what shipped. This walks every `index.html` built under `react/demo/`, sets
 * aside the pages that merely forward the reader on, and fails with the names
 * of any remaining route the sitemap does not carry.
 *
 * A page is set aside on either of two independent grounds: the manifest marks
 * it `indexable: false`, or its built HTML carries a meta refresh. The sniff is
 * what makes an unregistered stub safe — it is excluded on its own evidence
 * rather than on being listed anywhere.
 *
 * The reverse direction is checked too: a sitemap `<loc>` under `/react/demo/` with
 * no built page behind it is a URL that 404s for every crawler that follows it.
 *
 * Runs in the docs workflow right after the compose step, and standalone via
 * `node scripts/check-sitemap.mjs [composed-site-dir]` once a composed tree
 * exists (default `apps/docs/dist`).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";
import { DEMO_ROOT } from "./site.mjs";
import {
  isRedirectPage,
  locsIn,
  routeForFile,
  SITE,
} from "./sitemap-routes.mjs";

/** Where the showcase is mounted inside the composed site. */
const DEMO_DIR = DEMO_ROOT.slice(1, -1);

const DEFAULT_ROOT = fileURLToPath(
  new URL("../apps/docs/dist", import.meta.url)
);

const INDEX = "index.html";

/**
 * Every built demo page under a composed site root, as `{ route, file }` in
 * route order. Directory entries and bundled assets are not pages, so only
 * `index.html` files count.
 */
export const demoPages = (root) => {
  const dir = join(root, DEMO_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map((entry) => entry.split(sep).join("/"))
    .filter((rel) => rel === INDEX || rel.endsWith(`/${INDEX}`))
    .map((rel) => ({
      route: routeForFile(`${DEMO_DIR}/${rel}`),
      file: join(dir, rel),
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
};

/**
 * Split the built pages into the routes the sitemap must carry and the ones it
 * must not.
 */
export const classifyDemoPages = (root, manifest = SHOWCASE_PAGES) => {
  const unindexable = new Set(
    manifest.filter((page) => !page.indexable).map((page) => page.route)
  );
  const crawlable = [];
  const redirects = [];
  for (const { route, file } of demoPages(root)) {
    const forwards =
      unindexable.has(route) || isRedirectPage(readFileSync(file, "utf8"));
    (forwards ? redirects : crawlable).push(route);
  }
  return { crawlable, redirects };
};

/** Demo routes the sitemap advertises that the composed site does not serve. */
export const deadRoutes = (root, xml) =>
  locsIn(xml)
    .filter((loc) => loc.startsWith(`${SITE}/${DEMO_DIR}/`))
    .map((loc) => loc.slice(SITE.length))
    .filter((route) => !existsSync(join(root, route.slice(1), INDEX)));

/**
 * The whole verdict in one pass over the composed tree: what shipped, what was
 * set aside, and the two ways the tree and the sitemap can disagree —
 * `missing` is a page a crawler cannot reach, `dead` is a URL that 404s.
 */
export const auditDemoRoutes = (root, xml, manifest = SHOWCASE_PAGES) => {
  const { crawlable, redirects } = classifyDemoPages(root, manifest);
  const locs = new Set(locsIn(xml));
  return {
    crawlable,
    redirects,
    missing: crawlable.filter((route) => !locs.has(`${SITE}${route}`)),
    dead: deadRoutes(root, xml),
  };
};

const fail = (message) => {
  console.error(`check-sitemap: ${message}`);
  process.exit(1);
};

const summary = (crawlable, redirects) => {
  const listed =
    `check-sitemap: ${crawlable.length} crawlable demo routes, ` +
    `all listed in sitemap.xml`;
  if (redirects.length === 0) return listed;
  const noun = redirects.length === 1 ? "redirect" : "redirects";
  return (
    `${listed}; ${redirects.length} ${noun} excluded ` +
    `(${redirects.join(", ")})`
  );
};

const main = () => {
  const root = resolve(process.argv[2] ?? DEFAULT_ROOT);
  const sitemap = join(root, "sitemap.xml");

  // Finding nothing must never read as passing: without a composed tree there
  // is no evidence either way, and the run says so instead of reporting green.
  if (!existsSync(join(root, DEMO_DIR))) {
    fail(
      `no demo pages under ${join(root, DEMO_DIR)} — build the docs site and ` +
        `the showcase, copy apps/showcase/dist into apps/docs/dist/${DEMO_DIR}, then ` +
        `run this again.`
    );
  }
  if (!existsSync(sitemap)) {
    fail(`${sitemap} does not exist — the docs build writes it in postbuild.`);
  }

  const xml = readFileSync(sitemap, "utf8");
  const { crawlable, redirects, missing, dead } = auditDemoRoutes(root, xml);

  if (missing.length > 0 || dead.length > 0) {
    const lines = [
      ...missing.map((route) => `  missing from sitemap.xml: ${route}`),
      ...dead.map((route) => `  in sitemap.xml but not built: ${route}`),
    ];
    fail(
      `the composed site and sitemap.xml disagree on ${
        missing.length + dead.length
      } demo route(s):\n${lines.join("\n")}\n` +
        `Register the page in apps/showcase/pages.mjs — Vite's inputs and the ` +
        `sitemap are both generated from it.`
    );
  }

  console.log(summary(crawlable, redirects));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
