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
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

import { sidebarSlugs } from "../apps/docs/sidebar.mjs";
import { DESCRIPTIONS, TITLES } from "../apps/docs/sync-docs.mjs";
import { DOCS } from "./build-llms-full.mjs";
import { docLinkTarget, docsFiles } from "./docs-files.mjs";
import {
  packageDir,
  packageNames,
  REPO_ROOT,
  resolvePackagePath,
} from "./packages.mjs";
import { docsRoute, siteUrl } from "./site.mjs";

const DOCS_DIR = join(REPO_ROOT, "docs");
/**
 * The reference page. Its title claims every export, so appearing on some
 * feature page is not enough — a reader who goes looking for a name goes here.
 */
const REFERENCE_PAGE = "api.md";

/**
 * The built file a subpath resolves to, as the package itself declares it.
 *
 * Conditional exports nest, so the target is whatever string this branch
 * bottoms out at; a non-JS condition (`./styles.css`) bottoms out at a string
 * directly.
 */
function targetOf(value) {
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object") return undefined;
  for (const condition of ["import", "require", "default"]) {
    if (condition in value) {
      const resolved = targetOf(value[condition]);
      if (resolved !== undefined) return resolved;
    }
  }
  return undefined;
}

/**
 * Every published package's export surface, one audit per importable entry.
 *
 * Both halves are READ from each package's `exports` map rather than written
 * here, because anything restated is a second place to remember. The subpath
 * list is read because `/pivot` and `/formula` shipped while a hand-written
 * array still named five core entries. The SOURCE FILE is read from the same
 * map because a subpath need not be spelled like the module behind it:
 * `./ag-ui` is built from `agui.ts`, `./ai-sdk` from `aiSdk.ts`, and a guess
 * from the subpath finds neither. Deriving both means a new entry is audited
 * the moment it is published, whatever it is called.
 *
 * Non-JS conditions (`./styles.css`) and `./package.json` are not APIs.
 */
/**
 * Every documented entry a package advertises, resolved through its exports
 * map rather than its subpath name.
 *
 * `root` exists so this can be pointed at a fixture: a guard nobody can aim
 * at a broken tree is a guard nobody can prove still fails. Production passes
 * nothing and gets the repository.
 */
export function entriesOf(pkg, root = REPO_ROOT) {
  const manifest = JSON.parse(
    readFileSync(join(packageDir(pkg, root), "package.json"), "utf8")
  );
  const exported = manifest.exports ?? { ".": "./dist/index.js" };
  return Object.keys(exported)
    .filter((key) => key === "." || !key.slice(2).includes("."))
    .sort()
    .map((key) => {
      const label = key === "." ? pkg : `${pkg}/${key.slice(2)}`;
      // ng-packagr bundles an entry into `dist/fesm2022/…`, a path with no
      // source beside it; the entry it bundles is named in `ng-package.json`.
      const built = ngPackageEntry(pkg, key, root);
      if (built) return { label, entry: built };
      const target = targetOf(exported[key]);
      const stem = join(
        pkg,
        "src",
        (target ?? "index")
          .replace(/^\.\/dist\//, "")
          .replace(/\.[cm]?[jt]sx?$/, "")
      );
      // A feature entry that renders is `.tsx`; the rest are `.ts`.
      const entry = existsSync(resolvePackagePath(`${stem}.ts`, root))
        ? `${stem}.ts`
        : `${stem}.tsx`;
      return { label, entry };
    });
}

/**
 * The source entry ng-packagr builds a subpath from, read from the
 * `ng-package.json` beside the subpath's folder; `undefined` for a package
 * built any other way.
 */
function ngPackageEntry(pkg, key, root) {
  const folder = join(packageDir(pkg, root), key === "." ? "" : key.slice(2));
  const config = join(folder, "ng-package.json");
  if (!existsSync(config)) return undefined;
  const entryFile = JSON.parse(readFileSync(config, "utf8")).lib?.entryFile;
  // Spelled the way the other entries are: from the package's folder name.
  return entryFile === undefined
    ? undefined
    : join(pkg, relative(packageDir(pkg, root), join(folder, entryFile)));
}

const SURFACES = packageNames()
  // Wrapped, not passed by reference: `flatMap` hands the callback an index as
  // its second argument, which is now this function's `root`.
  .flatMap((pkg) => entriesOf(pkg));

const docPages = docsFiles(DOCS_DIR);

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
  const entries = SURFACES.map((surface) => resolvePackagePath(surface.entry));
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
export function auditNav(pages = docPages, sidebar = sidebarSlugs()) {
  const slugs = pages.map((name) => name.replace(/\.md$/, ""));
  const linked = new Set(sidebar);
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
export function auditTitles(pages = docPages, titles = TITLES) {
  const named = new Set(Object.keys(titles));
  return {
    untitled: pages.filter((name) => !named.has(name)),
    stale: [...named]
      .filter((name) => !pages.includes(name))
      .sort((a, b) => a.localeCompare(b)),
    overlong: Object.entries(titles).filter(
      ([, title]) => (title + TITLE_SUFFIX).length > MAX_TITLE_LENGTH
    ),
    duplicate: duplicateValues(titles),
  };
}

/**
 * Starlight appends ` | AdaptTable` to every page title. Google shows about
 * 600 px (~60 characters) of a title and Bing flags titles past ~70, so the
 * full string stays within 60. A description past 160 characters is cut in
 * both engines' snippets.
 */
const TITLE_SUFFIX = " | AdaptTable";
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 160;

/** Entries whose value another entry already uses: `[name, value][]`. */
function duplicateValues(map) {
  const seen = new Map();
  const repeats = [];
  for (const [name, value] of Object.entries(map)) {
    if (seen.has(value)) repeats.push([name, value]);
    else seen.set(value, name);
  }
  return repeats;
}

/**
 * A page missing from the `DESCRIPTIONS` map falls back to the site-wide
 * Starlight description, so every such page shares one SERP snippet and one
 * og:description. `stale` are entries whose markdown is gone.
 */
export function auditDescriptions(
  pages = docPages,
  descriptions = DESCRIPTIONS
) {
  const described = new Set(Object.keys(descriptions));
  return {
    undescribed: pages.filter((name) => !described.has(name)),
    stale: [...described]
      .filter((name) => !pages.includes(name))
      .sort((a, b) => a.localeCompare(b)),
    overlong: Object.entries(descriptions).filter(
      ([, description]) => description.length > MAX_DESCRIPTION_LENGTH
    ),
    duplicate: duplicateValues(descriptions),
  };
}

function printDescriptionFailures({ undescribed, stale, overlong, duplicate }) {
  for (const [name, description] of overlong) {
    console.error(
      `\nDESCRIPTIONS["${name}"] is ${description.length} characters; ` +
        `search snippets cut it past ${MAX_DESCRIPTION_LENGTH}.`
    );
  }
  for (const [name] of duplicate) {
    console.error(`\nDESCRIPTIONS["${name}"] repeats another page's snippet.`);
  }
  if (undescribed.length > 0) {
    console.error(
      `\n${undescribed.length} docs page(s) have no entry in the DESCRIPTIONS ` +
        `map of apps/docs/sync-docs.mjs — each ships the site-wide default ` +
        `as its SERP snippet:`
    );
    for (const name of undescribed) console.error(`  - docs/${name}`);
  }
  if (stale.length > 0) {
    console.error(
      `\n${stale.length} DESCRIPTIONS entr(ies) in apps/docs/sync-docs.mjs ` +
        `name a page that does not exist:`
    );
    for (const name of stale) console.error(`  - ${name}`);
  }
}

/**
 * `docs/` and the `DOCS` reading order in `build-llms-full.mjs` compared
 * both ways. A page missing from that array still builds the site and
 * still appears in `llms.txt`; it just never lands in `llms-full.txt`.
 */
export function auditLlmsOrder(pages = docPages, order = DOCS) {
  return {
    unlisted: pages.filter((name) => !order.includes(name)),
    stale: order.filter((name) => !pages.includes(name)),
    duplicate: order.filter((name, index) => order.indexOf(name) !== index),
  };
}

function printLlmsOrderFailures({ unlisted, stale, duplicate }) {
  for (const name of duplicate) console.error(`\nDOCS repeats ${name}.`);
  if (unlisted.length > 0) {
    console.error(
      `\n${unlisted.length} docs page(s) are missing from the DOCS reading ` +
        `order in scripts/build-llms-full.mjs — llms-full.txt will omit them:`
    );
    for (const name of unlisted) console.error(`  - docs/${name}`);
  }
  if (stale.length > 0) {
    console.error(
      `\n${stale.length} DOCS entr(ies) in scripts/build-llms-full.mjs name ` +
        `a page that does not exist:`
    );
    for (const name of stale) console.error(`  - ${name}`);
  }
}

/**
 * Every docs page advertises `og/<slug>.png` as its og:image and
 * twitter:image (see `apps/docs/sync-docs.mjs`). A page without that file
 * shares with a broken preview. `pnpm og:cards` renders the missing ones.
 */
const OG_DIR = join(REPO_ROOT, "apps", "docs", "public", "og");

export function auditOgImages(pages = docPages, directory = OG_DIR) {
  return pages.filter(
    (name) => !existsSync(join(directory, name.replace(/\.md$/, ".png")))
  );
}

/** Every canonical guide needs exactly one link in the hand-written LLM index. */
export function auditLlmsIndex(
  pages = docPages,
  index = readFileSync(join(REPO_ROOT, "llms.txt"), "utf8")
) {
  const links = [...index.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map(
    (match) => match[1]
  );
  return pages.flatMap((file) => {
    const url = siteUrl(docsRoute(file));
    const count = links.filter((link) => link === url).length;
    return count === 1 ? [] : [{ file, count }];
  });
}

/** Remove complete triple-backtick blocks without rescanning unmatched tails. */
function withoutFencedCode(markdown) {
  const parts = [];
  let cursor = 0;
  let opening = markdown.indexOf("```");
  while (opening !== -1) {
    const newline = markdown.indexOf("\n", opening + 3);
    if (newline === -1) break;
    const closing = markdown.indexOf("```", newline + 1);
    if (closing === -1) break;
    parts.push(markdown.slice(cursor, opening));
    cursor = closing + 3;
    opening = markdown.indexOf("```", cursor);
  }
  parts.push(markdown.slice(cursor));
  return parts.join("");
}

/** Read inline link destinations, allowing optional titles after whitespace. */
function markdownLinkHrefs(markdown) {
  const hrefs = [];
  let cursor = 0;
  while (cursor < markdown.length) {
    const opening = markdown.indexOf("](", cursor);
    if (opening === -1) break;
    const start = opening + 2;
    let end = start;
    while (end < markdown.length && !/[\s)]/.test(markdown[end])) end++;
    if (end === start) {
      cursor = end + 1;
      continue;
    }
    const closing = markdown.indexOf(")", end);
    if (closing === -1) break;
    hrefs.push(markdown.slice(start, end));
    cursor = closing + 1;
  }
  return hrefs;
}

/** Relative guide links must resolve from their source folder to a real guide. */
export function auditDocLinks(
  directory = DOCS_DIR,
  pages = docsFiles(directory)
) {
  const sources = new Set(pages);
  return pages.flatMap((file) => {
    const markdown = withoutFencedCode(
      readFileSync(join(directory, file), "utf8")
    );
    return markdownLinkHrefs(markdown).flatMap((href) => {
      const target = docLinkTarget(file, href);
      return target && !sources.has(target.file)
        ? [{ file, href, target: target.file }]
        : [];
    });
  });
}

function printOgImageFailures(missing) {
  if (missing.length === 0) return;
  console.error(
    `\n${missing.length} docs page(s) have no apps/docs/public/og image — ` +
      `their og:image and twitter:image point at a missing file:`
  );
  for (const name of missing) console.error(`  - docs/${name}`);
}

function printTitleFailures({ untitled, stale, overlong, duplicate }) {
  for (const [name, title] of overlong) {
    console.error(
      `\nTITLES["${name}"] is ${(title + TITLE_SUFFIX).length} characters ` +
        `with "${TITLE_SUFFIX}"; search results cut it past ${MAX_TITLE_LENGTH}.`
    );
  }
  for (const [name] of duplicate) {
    console.error(`\nTITLES["${name}"] repeats another page's title.`);
  }
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

/** One line per failing audit, after the detailed listings. */
function printFailureSummary({
  undocumentedTotal,
  missingRefTotal,
  navFailures,
  titleFailures,
  descriptionFailures,
  llmsOrderFailures,
  missingOgImages,
}) {
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
      `${titleFailures} title problem(s). Every docs/*.md page needs a ` +
        `unique TITLES entry in apps/docs/sync-docs.mjs within ` +
        `${MAX_TITLE_LENGTH} characters with the suffix, and every entry ` +
        `needs its page.`
    );
  }
  if (descriptionFailures > 0) {
    console.error(
      `${descriptionFailures} description problem(s). Every docs/*.md page ` +
        `needs a unique DESCRIPTIONS entry in apps/docs/sync-docs.mjs within ` +
        `${MAX_DESCRIPTION_LENGTH} characters, and every entry needs its page.`
    );
  }
  if (llmsOrderFailures > 0) {
    console.error(
      `${llmsOrderFailures} llms-full reading-order mismatch(es). Every ` +
        `docs/*.md page belongs in the DOCS array of ` +
        `scripts/build-llms-full.mjs, and every entry there needs its page.`
    );
  }
  if (missingOgImages.length > 0) {
    console.error(
      `${missingOgImages.length} missing og image(s). Run \`pnpm og:cards\`.`
    );
  }
}

function main() {
  const audits = auditPackages();
  const nav = auditNav();
  const titles = auditTitles();
  const titleFailures =
    titles.untitled.length +
    titles.stale.length +
    titles.overlong.length +
    titles.duplicate.length;
  const descriptions = auditDescriptions();
  const descriptionFailures =
    descriptions.undescribed.length +
    descriptions.stale.length +
    descriptions.overlong.length +
    descriptions.duplicate.length;
  const llmsOrder = auditLlmsOrder();
  const llmsOrderFailures =
    llmsOrder.unlisted.length +
    llmsOrder.stale.length +
    llmsOrder.duplicate.length;
  const llmsIndex = auditLlmsIndex();
  const docLinks = auditDocLinks();
  const navFailures = nav.orphans.length + nav.dead.length;
  const missingOgImages = auditOgImages();
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
    console.log(
      `Descriptions: ${descriptions.undescribed.length} page(s) with no ` +
        `DESCRIPTIONS entry, ${descriptions.stale.length} entr(ies) without a page.`
    );
    console.log(
      `llms-full: ${llmsOrder.unlisted.length} page(s) missing from DOCS, ` +
        `${llmsOrder.stale.length} entr(ies) without a page.`
    );
    console.log(
      `Links: ${llmsIndex.length} LLM index mismatch(es), ${docLinks.length} dead relative docs link(s).`
    );
    return;
  }
  if (
    undocumentedTotal > 0 ||
    missingRefTotal > 0 ||
    navFailures > 0 ||
    titleFailures > 0 ||
    descriptionFailures > 0 ||
    llmsOrderFailures > 0 ||
    missingOgImages.length > 0 ||
    llmsIndex.length > 0 ||
    docLinks.length > 0
  ) {
    printFailures(audits, missingFromReference);
    printNavFailures(nav);
    printTitleFailures(titles);
    printDescriptionFailures(descriptions);
    printLlmsOrderFailures(llmsOrder);
    printOgImageFailures(missingOgImages);
    for (const { file, count } of llmsIndex)
      console.error(
        `llms.txt: ${file} has ${count} canonical links; expected exactly one.`
      );
    for (const { file, href, target } of docLinks)
      console.error(`docs/${file}: ${href} points to missing docs/${target}.`);
    printFailureSummary({
      undocumentedTotal,
      missingRefTotal,
      navFailures,
      titleFailures,
      descriptionFailures,
      llmsOrderFailures,
      missingOgImages,
    });
    process.exit(1);
  }
  console.log(
    `doc-surface: all ${exportTotal} exports documented, ` +
      `all ${docPages.length} pages in the sidebar, titled, described, ` +
      `with an og image, one LLM index link, valid relative docs links and in llms-full.`
  );
}

// Only when run as the command. Importing this module — which a test that aims
// `entriesOf` at a fixture must do — would otherwise run the whole audit and
// exit on its result. Same guard `ai-isolation.mjs` uses.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
