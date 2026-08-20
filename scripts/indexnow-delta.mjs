/**
 * IndexNow delta: which published URLs actually changed.
 * The CLI hashes the composed dist and POSTs only those URLs.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { SITE } from "./sitemap-routes.mjs";

/**
 * Map a file under the composed site to its public URL.
 * `index.html` at a directory is the slash URL that the sitemap carries.
 *
 * @param {string} rel posix path relative to dist (`filtering/index.html`)
 */
export function urlFromRel(rel) {
  const posix = rel.replaceAll("\\", "/");
  if (posix === "index.html") return `${SITE}/`;
  if (posix.endsWith("/index.html")) {
    return `${SITE}/${posix.slice(0, -"index.html".length)}`;
  }
  if (posix.endsWith(".html")) {
    return `${SITE}/${posix.slice(0, -".html".length)}`;
  }
  return `${SITE}/${posix}`;
}

/**
 * @param {string} distDir
 * @returns {Record<string, string>} url → sha256 of the file bytes
 */
export function hashesFromDist(distDir) {
  /** @type {Record<string, string>} */
  const out = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith(".html")) continue;
      const rel = relative(distDir, full);
      const url = urlFromRel(rel);
      out[url] = createHash("sha256").update(readFileSync(full)).digest("hex");
    }
  };
  walk(distDir);
  return out;
}

/**
 * URLs whose content is new or different. First seed (empty previous)
 * returns an empty list so we do not IndexNow-blast the whole sitemap.
 *
 * @param {Record<string, string>} previous
 * @param {Record<string, string>} next
 */
export function urlsToSubmit(previous, next) {
  if (previous == null || Object.keys(previous).length === 0) return [];
  /** @type {string[]} */
  const urls = [];
  for (const [url, hash] of Object.entries(next)) {
    if (previous[url] !== hash) urls.push(url);
  }
  return urls.sort();
}
