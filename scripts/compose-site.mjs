#!/usr/bin/env node
/**
 * Put the built showcase into the composed site.
 *
 * The showcase is one Vite app for every framework, built into one `dist`, but
 * the site serves each framework's demo pages under that framework's own demo
 * root (`DEMO_ROOTS` in `scripts/site.mjs`): React's under `/react/demo/`,
 * Angular's under `/angular/demo/`. So each root gets the whole build — the
 * shared assets every page loads by a relative path — minus the page folders
 * of the other frameworks, which would otherwise answer at an address their
 * canonical link disowns.
 *
 * Which folder belongs to which framework comes from the page manifest
 * (`apps/showcase/pages.mjs`), the list the build, the sitemap and this share.
 * A page that boots no bundle belongs to React's section, where the routes it
 * forwards from were published.
 *
 *   node scripts/compose-site.mjs [showcase-dist] [site-dir]
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";
import { DEMO_ROOTS, FRAMEWORK } from "./site.mjs";

const DEFAULT_DIST = fileURLToPath(
  new URL("../apps/showcase/dist", import.meta.url)
);
const DEFAULT_SITE = fileURLToPath(
  new URL("../apps/docs/dist", import.meta.url)
);

/** The top-level entry of the build a page's HTML lives in. */
const topEntry = (html) => html.replace(/^\.\//, "").split("/")[0];

/**
 * Each framework's top-level page entries in the build.
 *
 * @param {readonly { html: string, framework: string | null }[]} pages
 * @returns {Map<string, Set<string>>}
 */
export function pageEntriesByFramework(pages) {
  const byFramework = new Map();
  for (const page of pages) {
    const framework = page.framework ?? FRAMEWORK;
    const entries = byFramework.get(framework) ?? new Set();
    entries.add(topEntry(page.html));
    byFramework.set(framework, entries);
  }
  return byFramework;
}

/**
 * Copy the build into the site, one demo root per framework that has pages.
 *
 * @param {object} options
 * @param {string} options.dist the showcase's build output
 * @param {string} options.site the composed site's root
 * @param {readonly { html: string, framework: string | null }[]} [options.pages]
 *   the page manifest
 * @returns {{ root: string, entries: string[] }[]} what each root received
 */
export function composeDemos({ dist, site, pages = SHOWCASE_PAGES }) {
  const byFramework = pageEntriesByFramework(pages);
  const built = readdirSync(dist).sort();
  return [...byFramework].map(([framework, own]) => {
    const root = DEMO_ROOTS[framework];
    if (root === undefined) {
      throw new Error(
        `compose-site: no demo root is served for "${framework}"`
      );
    }
    const others = new Set(
      [...byFramework]
        .filter(([other]) => other !== framework)
        .flatMap(([, entries]) => [...entries])
        .filter((entry) => !own.has(entry))
    );
    const target = join(site, root);
    mkdirSync(target, { recursive: true });
    const entries = built.filter((entry) => !others.has(entry));
    for (const entry of entries) {
      cpSync(join(dist, entry), join(target, entry), { recursive: true });
    }
    return { root, entries };
  });
}

function main() {
  const dist = resolve(process.argv[2] ?? DEFAULT_DIST);
  const site = resolve(process.argv[3] ?? DEFAULT_SITE);
  if (!existsSync(dist)) {
    console.error(`compose-site: no showcase build at ${dist}`);
    process.exit(1);
  }
  for (const { root, entries } of composeDemos({ dist, site })) {
    console.log(`compose-site: ${root} ← ${entries.length} entries`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
