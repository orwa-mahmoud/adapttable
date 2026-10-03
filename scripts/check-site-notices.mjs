#!/usr/bin/env node
/** Run after composition, before uploading or deploying website assets. */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEMO_ROOTS } from "./site.mjs";
import { checkNotices } from "./site-notices.mjs";

export function checkSiteNotices(site) {
  return [
    site,
    ...Object.values(DEMO_ROOTS).map((root) => resolve(site, `.${root}`)),
  ].map((directory) => ({ directory, packages: checkNotices(directory) }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const site = resolve(process.argv[2] ?? "apps/docs/dist");
  for (const result of checkSiteNotices(site))
    console.log(
      `site-notices: ${result.directory}: ${result.packages} package notices`
    );
}
