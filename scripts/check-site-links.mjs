#!/usr/bin/env node
/**
 * Verify every same-site link in the COMPOSED site lands on a file it ships.
 *
 * The docs build (Astro) and the showcase build (Vite) write their own links,
 * the showcase is mounted inside the docs output afterwards, and the landing
 * page, the demo pages and the docs all link across that seam. A link is
 * resolved the way the host serves it — a trailing slash is the directory's
 * `index.html`, an extensionless path is the directory or the `.html` file —
 * and fails when neither exists. Absolute URLs on the site's own origin are
 * checked the same way; other origins, fragments and `mailto:` are not.
 *
 * Runs in the Site workflow after the compose step, and standalone via
 * `node scripts/check-site-links.mjs [composed-site-root]`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { ORIGIN } from "./site.mjs";

const DEFAULT_ROOT = fileURLToPath(
  new URL("../apps/docs/dist", import.meta.url)
);

const ATTRIBUTE = /\s(?:href|src|poster)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/**
 * The not-found page is served for routes that do not exist, so the canonical
 * link Starlight gives it names no page and is not a link a reader follows.
 */
const NOT_FOUND = "404.html";

/** Every HTML file under `root`, as a POSIX path relative to it. */
export const htmlFiles = (root) =>
  readdirSync(root, { recursive: true })
    .map((entry) => entry.split(sep).join("/"))
    .filter((rel) => rel.endsWith(".html") && rel !== NOT_FOUND);

/** The page URL a built file is served at: `a/index.html` → `/a/`. */
export const pageUrl = (rel) =>
  `/${rel.endsWith("index.html") ? rel.slice(0, -"index.html".length) : rel}`;

/**
 * The same-site path a link points at, or `undefined` for links this check
 * does not own: other origins, fragments, `mailto:`, `data:` and scripts.
 *
 * @param {string} link - The attribute value as written.
 * @param {string} from - The URL path of the page it is written on.
 */
export const targetPath = (link, from) => {
  const value = link.trim();
  if (value === "" || value.startsWith("#")) return undefined;
  if (/^(mailto|tel|data|javascript|blob):/i.test(value)) return undefined;
  if (value.includes("${")) return undefined;
  const url = new URL(value, `${ORIGIN}${from}`);
  if (url.origin !== ORIGIN) return undefined;
  return decodeURIComponent(url.pathname);
};

/**
 * Whether the composed site serves `path`.
 *
 * @param {string} root
 * @param {string} path
 */
export const serves = (root, path) => {
  const file = join(root, path);
  if (path.endsWith("/")) return existsSync(join(file, "index.html"));
  if (existsSync(file) && statSync(file).isFile()) return true;
  return existsSync(join(file, "index.html")) || existsSync(`${file}.html`);
};

/**
 * Every same-site link under `root` that resolves to nothing, as
 * `{ page, link }`.
 *
 * @param {string} root
 */
export const brokenLinks = (root) => {
  const broken = [];
  for (const rel of htmlFiles(root)) {
    const from = pageUrl(rel);
    const html = readFileSync(join(root, rel), "utf8");
    for (const match of html.matchAll(ATTRIBUTE)) {
      const link = match[1] ?? match[2] ?? "";
      const path = targetPath(link, from);
      if (path !== undefined && !serves(root, path)) {
        broken.push({ page: from, link });
      }
    }
  }
  return broken;
};

const main = () => {
  const root = resolve(process.argv[2] ?? DEFAULT_ROOT);
  if (!existsSync(join(root, "index.html"))) {
    console.error(
      `check-site-links: no composed site at ${root} — build the docs site ` +
        `and the showcase and compose them first.`
    );
    process.exit(1);
  }
  const broken = brokenLinks(root);
  const pages = htmlFiles(root).length;
  if (broken.length > 0) {
    const shown = broken
      .slice(0, 50)
      .map(({ page, link }) => `  ${page} → ${link}`)
      .join("\n");
    console.error(
      `check-site-links: ${broken.length} broken same-site link(s) across ` +
        `${pages} pages:\n${shown}`
    );
    process.exit(1);
  }
  console.log(
    `check-site-links: every same-site link resolves (${pages} pages)`
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
