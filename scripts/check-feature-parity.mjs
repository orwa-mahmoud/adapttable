#!/usr/bin/env node
/**
 * Generated from `feature-classification.json`: every published kit exposes
 * the same feature subpaths, no root table imports a sibling kit or the
 * features aggregate barrel, and every kit passes core's header-cell props
 * through whole.
 *
 *   node scripts/check-feature-parity.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = join(ROOT, "packages");
const manifest = JSON.parse(
  readFileSync(join(ROOT, "scripts", "feature-classification.json"), "utf8")
);

const PUBLISHED = readdirSync(PACKAGES).filter((name) => {
  if (!name.startsWith("adapter-") || name === "adapter-bootstrap") {
    return false;
  }
  const pkg = JSON.parse(
    readFileSync(join(PACKAGES, name, "package.json"), "utf8")
  );
  return pkg.private !== true;
});

/** `/preset` ships on every kit but is not a feature entry in the manifest. */
const EXTRA_SUBPATHS = ["./preset"];

const subpaths = [
  ...new Set(
    Object.values(manifest.features).map((feature) => `./${feature.subpath}`)
  ),
  ...EXTRA_SUBPATHS,
].sort();

/**
 * Core states a header cell's props once and every kit has to put the whole
 * object on its own element. A kit that reads named fields off it instead
 * drops whatever core adds next, silently: `role` and `scope` reached four
 * kits out of eight that way, and nothing failed, because the table still
 * looked right. Two shapes satisfy this — spreading `leaf.headerProps`, or
 * handing core's `getHeaderCellProps` to a kit that builds its own header
 * (antd's `onHeaderCell` is the whole of its `<th>`).
 */
const HEADER_SPREAD = /\.\.\.leaf\.headerProps(?!\s*\[)/;
const HEADER_NAMED = /leaf\.headerProps\s*\[/;
const HEADER_HANDOFF = /getHeaderCellProps/;
/** shadcn renders through `@adapttable/unstyled`, so it has no header of its own. */
const NO_HEADER_OF_ITS_OWN = new Set(["adapter-shadcn"]);

/**
 * The code, without its comments.
 *
 * Written as a scan rather than a regex: a comment stripper is exactly the
 * shape that backtracks badly on a long source file, and this runs over every
 * file in eight packages.
 */
function firstComment(source, index) {
  const block = source.indexOf("/*", index);
  const line = source.indexOf("//", index);
  if (block === -1) return { at: line, block: false };
  if (line === -1) return { at: block, block: true };
  return block < line ? { at: block, block: true } : { at: line, block: false };
}

function stripComments(source) {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const { at, block } = firstComment(source, index);
    if (at === -1) return out + source.slice(index);
    out += source.slice(index, at);
    const close = source.indexOf(block ? "*/" : "\n", at + 2);
    if (close === -1) return out;
    index = block ? close + 2 : close;
  }
  return out;
}

/**
 * The layers a kit is built ON: the neutral engine and the React binding,
 * either at any subpath. Everything else under `@adapttable/` is another
 * kit's pixels, which is what this rule keeps out.
 */
const SHARED_LAYERS = ["@adapttable/core", "@adapttable/react"];
/** shadcn's kit IS unstyled's components restyled, so it builds on them too. */
const KIT_LAYER = new Map([["adapter-shadcn", "@adapttable/unstyled"]]);
const ADAPTTABLE_IMPORT = /from\s+["'](@adapttable\/[^"']+)["']/g;

/** True when `specifier` names `pkg` itself or one of its subpaths. */
function isFrom(specifier, pkg) {
  return specifier === pkg || specifier.startsWith(`${pkg}/`);
}

const problems = [];

for (const adapter of PUBLISHED) {
  const pkg = JSON.parse(
    readFileSync(join(PACKAGES, adapter, "package.json"), "utf8")
  );
  const exports = pkg.exports ?? {};
  for (const subpath of subpaths) {
    if (!(subpath in exports)) {
      problems.push(`${pkg.name}: missing export ${subpath}`);
    }
  }

  const src = join(PACKAGES, adapter, "src");
  const files = readdirSync(src, { recursive: true })
    .filter((name) => typeof name === "string" && /\.(tsx?|jsx?)$/.test(name))
    .map((name) => join(src, name));

  let passesHeaderProps = NO_HEADER_OF_ITS_OWN.has(adapter);
  const own = KIT_LAYER.get(adapter);
  const allowed = own ? [...SHARED_LAYERS, own] : SHARED_LAYERS;

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    // An import in a doc comment is an EXAMPLE — `@adapttable/mui/preset` in
    // the preset's own usage block is what a reader types, not what this
    // module pulls in. Scan the code.
    const text = stripComments(source);
    const rel = file.slice(PACKAGES.length + 1);
    if (rel.endsWith(".test.tsx") || rel.endsWith(".test.ts")) continue;
    if (HEADER_SPREAD.test(text) || HEADER_HANDOFF.test(text)) {
      passesHeaderProps = true;
    }
    if (HEADER_NAMED.test(text) && !HEADER_SPREAD.test(text)) {
      problems.push(
        `${rel}: reads named fields off leaf.headerProps without spreading it`
      );
    }
    for (const specifier of new Set(
      [...text.matchAll(ADAPTTABLE_IMPORT)].map((match) => match[1])
    )) {
      if (!allowed.some((layer) => isFrom(specifier, layer))) {
        problems.push(`${rel}: imports sibling kit ${specifier}`);
      }
    }
    if (
      /(?:^|\/)DataTable\.tsx$/.test(rel) &&
      /from\s+["'](?:\.\/features|@adapttable\/[^"']+\/features)["']/.test(text)
    ) {
      problems.push(`${rel}: root table imports the features aggregate barrel`);
    }
  }

  if (!passesHeaderProps) {
    problems.push(
      `${pkg.name}: never passes core's header-cell props to its header element`
    );
  }
}

if (problems.length > 0) {
  console.error(`feature parity: ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `feature parity: ${PUBLISHED.length} kits share ${subpaths.length} subpaths ` +
    `and pass core's header props through whole`
);
