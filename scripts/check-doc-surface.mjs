#!/usr/bin/env node
/**
 * Every public export must be documented — api.md claims "the complete
 * public surface", and for most of v1 that was false: 181 of ~305 core
 * exports appeared in no doc page. Whole shipped modules (headless cell
 * editing, row grouping, the CSV pipeline) were invisible to anyone who
 * didn't read source, while versioning.md declared some of those same
 * names committed-stable. Nothing caught it: exports compile, tests
 * cover them, the site builds — only a reader notices, and readers leave.
 *
 * So the gate checks it: this script enumerates every package's real
 * export surface (via the TypeScript checker, so `export *`, aliases and
 * type-only exports all count) and fails on any name that no hand-written
 * doc page mentions. Exporting something IS documenting it — if a name
 * shouldn't be documented, it shouldn't be exported.
 *
 * The same script guards the way IN to those pages. A page reachable only by
 * typing its URL is as good as unpublished, and a nav entry pointing at a file
 * that no longer exists is a dead link — so the sidebar and `docs/` are
 * compared in both directions here, against the array the site itself renders.
 *
 * `--report` prints the full per-package diff instead of failing fast —
 * useful when auditing rather than gating.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { sidebarSlugs } from "../apps/docs/sidebar.mjs";
import { TITLES } from "../apps/docs/sync-docs.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = join(REPO_ROOT, "docs");
/**
 * The reference page. Its title claims every export, so appearing on some
 * feature page is not enough — a reader who goes looking for a name goes here.
 */
const REFERENCE_PAGE = "api.md";

/**
 * Every published package's export surface, one audit per importable entry.
 *
 * The list is READ from each package's `exports` map rather than written here,
 * because a hand-written list is a second place to remember: `/pivot` and
 * `/formula` both shipped while this array still named five core entries, so
 * every export behind them was invisible to the gate that exists to see them.
 * Deriving it means a new subpath is audited the moment it is published.
 * Non-JS conditions (`./styles.css`) and `./package.json` are not APIs.
 */
function entriesOf(pkg) {
  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, "packages", pkg, "package.json"), "utf8")
  );
  return Object.keys(manifest.exports ?? { ".": {} })
    .filter((key) => key === "." || !key.slice(2).includes("."))
    .sort()
    .map((key) => ({
      label: key === "." ? pkg : `${pkg}/${key.slice(2)}`,
      entry: join(pkg, "src", key === "." ? "index.ts" : `${key.slice(2)}.ts`),
    }));
}

const SURFACES = readdirSync(join(REPO_ROOT, "packages"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .flatMap(entriesOf);

const docPages = readdirSync(DOCS_DIR)
  .filter((name) => name.endsWith(".md"))
  .sort();

const corpus = docPages
  .map((name) => readFileSync(join(DOCS_DIR, name), "utf8"))
  .join("\n");

const reference = readFileSync(join(DOCS_DIR, REFERENCE_PAGE), "utf8");

/** Word-boundary presence: `SortLevel` must not match inside `SortLevels`. */
function mentions(text, name) {
  const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`).test(text);
}

/** Somewhere under docs/ — a name shown working on its feature page. */
function isDocumented(name) {
  return mentions(corpus, name);
}

/**
 * In the reference specifically. Kept SEPARATE from the check above, because
 * the two failures want different fixes: a name in neither place needs
 * explaining, while a name documented on its feature page but absent here just
 * needs a line in the reference. Five exports shipped in exactly that state on
 * 2026-08-12 and a person caught them, which is this guard's job.
 */
function isInReference(name) {
  return mentions(reference, name);
}

function exportsOf(program, checker, entryPath) {
  const source = program.getSourceFile(entryPath);
  if (!source) throw new Error(`Missing entry ${entryPath}`);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`No module symbol for ${entryPath}`);
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => symbol.name)
    .filter((name) => name !== "default")
    .sort((a, b) => a.localeCompare(b));
}

function auditPackages() {
  const entries = SURFACES.map((surface) =>
    join(REPO_ROOT, "packages", surface.entry)
  );
  const program = ts.createProgram(entries, {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  return SURFACES.map((surface, index) => {
    const names = exportsOf(program, checker, entries[index]);
    const undocumented = new Set(names.filter((name) => !isDocumented(name)));
    return { pkg: surface.label, names, undocumented };
  });
}

/** One name's audit result, as the report column shows it. */
function stateOf(name, undocumented, missingFromReference) {
  if (undocumented.has(name)) return "MISSING";
  if (missingFromReference.has(name)) return "no-ref ";
  return "ok     ";
}

function printReport(audits, missingFromReference) {
  for (const { pkg, names, undocumented } of audits) {
    console.log(`\n## ${pkg} — ${names.length} exports`);
    for (const name of names) {
      console.log(
        `${stateOf(name, undocumented, missingFromReference)} ${name}`
      );
    }
  }
}

/**
 * Names the reference page never mentions, deduplicated across packages.
 *
 * The reference documents names, not per-package copies: `CellEditor` is a core
 * type all eight adapters re-export, so requiring it once is the whole
 * requirement. Counting it per surface turned 89 real gaps into 123 lines and
 * made the list look like busywork.
 *
 * Only documented names can be listed here — a name in no page at all is the
 * other failure, and reporting it twice under two headings helps nobody.
 */
function referenceGaps(audits) {
  const gaps = new Set();
  for (const { names, undocumented } of audits) {
    for (const name of names) {
      if (!undocumented.has(name) && !isInReference(name)) gaps.add(name);
    }
  }
  return new Set([...gaps].sort((a, b) => a.localeCompare(b)));
}

function printFailures(audits, missingFromReference) {
  for (const { pkg, undocumented } of audits) {
    if (undocumented.size === 0) continue;
    console.error(
      `\n${pkg}: ${undocumented.size} exported name(s) appear in no docs/*.md page:`
    );
    for (const name of undocumented) console.error(`  - ${name}`);
  }
  if (missingFromReference.size > 0) {
    console.error(
      `\n${missingFromReference.size} exported name(s) are documented on a feature page but ` +
        `missing from docs/${REFERENCE_PAGE}:`
    );
    for (const name of missingFromReference) console.error(`  - ${name}`);
  }
}

/**
 * The sidebar and `docs/` compared both ways.
 *
 * `orphans` are pages the nav never links: they build, they deploy, they rank
 * in search — and a reader who lands on one sees an empty left column with no
 * way to the rest of the docs. `dead` are nav entries whose markdown is gone,
 * which fails the Starlight build for everyone but is caught here first, in
 * seconds rather than after a full site build.
 */
function auditNav() {
  const slugs = docPages.map((name) => name.replace(/\.md$/, ""));
  const linked = new Set(sidebarSlugs());
  return {
    orphans: slugs.filter((slug) => !linked.has(slug)),
    dead: [...linked].filter((slug) => !slugs.includes(slug)).sort(),
  };
}

function printNavFailures({ orphans, dead }) {
  if (orphans.length > 0) {
    console.error(
      `\n${orphans.length} docs page(s) are missing from the sidebar in ` +
        `apps/docs/sidebar.mjs — a direct visit renders an empty nav:`
    );
    for (const slug of orphans) console.error(`  - docs/${slug}.md`);
  }
  if (dead.length > 0) {
    console.error(
      `\n${dead.length} sidebar entr(ies) in apps/docs/sidebar.mjs point at a ` +
        `page that does not exist:`
    );
    for (const slug of dead) console.error(`  - ${slug}`);
  }
}

/**
 * `docs/` and the page-title map compared both ways.
 *
 * A page missing from the `TITLES` map in `apps/docs/sync-docs.mjs` still
 * builds: Starlight falls back to the filename, so the page ships as
 * "filter-tree | AdaptTable" — a `<title>` that describes nothing, matches no
 * query and is the one string search results and browser tabs show first.
 * `stale` are entries whose markdown is gone; they mask the next real gap.
 */
function auditTitles() {
  const named = new Set(Object.keys(TITLES));
  return {
    untitled: docPages.filter((name) => !named.has(name)),
    stale: [...named]
      .filter((name) => !docPages.includes(name))
      .sort((a, b) => a.localeCompare(b)),
  };
}

function printTitleFailures({ untitled, stale }) {
  if (untitled.length > 0) {
    console.error(
      `\n${untitled.length} docs page(s) have no entry in the TITLES map of ` +
        `apps/docs/sync-docs.mjs — each ships with its filename as its title:`
    );
    for (const name of untitled) {
      console.error(`  - docs/${name} → "${name.replace(/\.md$/, "")}"`);
    }
  }
  if (stale.length > 0) {
    console.error(
      `\n${stale.length} TITLES entr(ies) in apps/docs/sync-docs.mjs name a ` +
        `page that does not exist:`
    );
    for (const name of stale) console.error(`  - ${name}`);
  }
}

function main() {
  const audits = auditPackages();
  const nav = auditNav();
  const titles = auditTitles();
  const titleFailures = titles.untitled.length + titles.stale.length;
  const navFailures = nav.orphans.length + nav.dead.length;
  const exportTotal = audits.reduce((sum, a) => sum + a.names.length, 0);
  const undocumentedTotal = audits.reduce(
    (sum, a) => sum + a.undocumented.size,
    0
  );
  const missingFromReference = referenceGaps(audits);
  const missingRefTotal = missingFromReference.size;

  if (process.argv.includes("--report")) {
    printReport(audits, missingFromReference);
    console.log(
      `\nTotal: ${exportTotal} exports, ${undocumentedTotal} undocumented, ` +
        `${missingRefTotal} missing from docs/${REFERENCE_PAGE}.`
    );
    console.log(
      `Nav: ${docPages.length} pages, ${nav.orphans.length} missing from the ` +
        `sidebar, ${nav.dead.length} sidebar entr(ies) without a page.`
    );
    console.log(
      `Titles: ${titles.untitled.length} page(s) with no TITLES entry, ` +
        `${titles.stale.length} entr(ies) without a page.`
    );
    return;
  }
  if (
    undocumentedTotal > 0 ||
    missingRefTotal > 0 ||
    navFailures > 0 ||
    titleFailures > 0
  ) {
    printFailures(audits, missingFromReference);
    printNavFailures(nav);
    printTitleFailures(titles);
    if (undocumentedTotal > 0) {
      console.error(
        `\n${undocumentedTotal} undocumented export(s). Document each name in docs/ or stop exporting it.`
      );
    }
    if (missingRefTotal > 0) {
      console.error(
        `${missingRefTotal} export(s) missing from docs/${REFERENCE_PAGE}. The reference page ` +
          `claims every export; add a line for each, or stop exporting it.`
      );
    }
    if (navFailures > 0) {
      console.error(
        `${navFailures} sidebar mismatch(es). Every docs/*.md page belongs in ` +
          `apps/docs/sidebar.mjs, and every entry there needs its page.`
      );
    }
    if (titleFailures > 0) {
      console.error(
        `${titleFailures} title mismatch(es). Every docs/*.md page needs a ` +
          `TITLES entry in apps/docs/sync-docs.mjs, and every entry needs its page.`
      );
    }
    process.exit(1);
  }
  console.log(
    `doc-surface: all ${exportTotal} exports documented, ` +
      `all ${docPages.length} pages in the sidebar and titled.`
  );
}

main();
