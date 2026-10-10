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
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";
import { DEMO_ROOTS, FRAMEWORK } from "./site.mjs";
import { checkNotices } from "./site-notices.mjs";

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
 * @param {readonly { html: string, framework: string | null, route?: string }[]} pages
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
 * @param {readonly { html: string, framework: string | null, route?: string }[]} [options.pages]
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
    // Main/lab source directories are distinct build inputs but their public
    // addresses belong at the framework root. Rebase only relative HTML URLs;
    // Vite's shared chunks stay in assets and their imports remain untouched.
    const relocated = pages.filter(
      (page) =>
        (page.framework ?? FRAMEWORK) === framework &&
        page.route &&
        page.html.replace(/^\.\//, "") !==
          `${page.route.slice(root.length)}index.html`
    );
    const relocatedEntries = new Set(
      relocated.map((page) => topEntry(page.html))
    );
    const entries = built.filter(
      (entry) => !others.has(entry) && !relocatedEntries.has(entry)
    );
    for (const entry of entries) {
      cpSync(join(dist, entry), join(target, entry), { recursive: true });
    }
    const pageDir = (path) => posix.dirname(path.replace(/^\.\//, ""));
    // Longest first, so a nested page wins over the folder that contains it.
    const moves = relocated
      .map((page) => [
        pageDir(page.html),
        posix.dirname(`${page.route.slice(root.length)}index.html`),
      ])
      .sort(([a], [b]) => b.length - a.length);
    // A link into a page that moved too must follow it to its new address.
    const moved = (path) => {
      for (const [from, to] of moves) {
        if (path === from) return to;
        if (path.startsWith(`${from}/`)) return to + path.slice(from.length);
      }
      return path;
    };
    for (const page of relocated) {
      const source = page.html.replace(/^\.\//, "");
      const destination = `${page.route.slice(root.length)}index.html`;
      const html = readFileSync(join(dist, source), "utf8").replace(
        /\b(src|href)="([^"#][^"]*)"/g,
        (attribute, name, value) => {
          if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(value)) return attribute;
          const cut = value.search(/[?#]/);
          const path = cut === -1 ? value : value.slice(0, cut);
          const suffix = cut === -1 ? "" : value.slice(cut);
          const resolved = moved(
            posix.normalize(posix.join(posix.dirname(source), path))
          );
          const rebased = posix.relative(posix.dirname(destination), resolved);
          const local = rebased.startsWith(".") ? rebased : `./${rebased}`;
          const slash = path.endsWith("/") && !local.endsWith("/") ? "/" : "";
          return `${name}="${local}${slash}${suffix}"`;
        }
      );
      mkdirSync(dirname(join(target, destination)), { recursive: true });
      writeFileSync(join(target, destination), html);
      entries.push(destination);
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
  checkNotices(dist);
  for (const { root, entries } of composeDemos({ dist, site })) {
    checkNotices(join(site, root));
    console.log(`compose-site: ${root} ← ${entries.length} entries`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
