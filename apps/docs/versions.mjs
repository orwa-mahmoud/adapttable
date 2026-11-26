/**
 * Archived documentation versions, newest first.
 *
 * Each entry has a frozen snapshot committed under
 * `src/content/docs/<slug>/` with its sidebar in
 * `src/content/versions/<slug>.json`, written by
 * `node scripts/archive-docs-version.mjs`. `starlight-versions` builds the
 * version picker and the per-version sidebar and search from this list; the
 * snapshot pages carry `noindex`, and `fix-sitemap.mjs` leaves them out of the
 * sitemap, so only the current docs are indexed.
 * `legacyPaths` marks archives that had flat paths on the previous site.
 */
export const DOCS_VERSIONS = [
  { slug: "v3", label: "v3" },
  { slug: "v2", label: "v2", legacyPaths: true },
  { slug: "v1", label: "v1", legacyPaths: true },
];

/** The picker's name for the current docs. */
export const CURRENT_VERSION_LABEL = "v4 (latest)";
