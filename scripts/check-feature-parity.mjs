#!/usr/bin/env node
/**
 * Generated from `feature-classification.json`: every participating kit exposes
 * the same feature subpaths, no root table imports a sibling kit or the
 * features aggregate barrel, and every kit passes core's header-cell props
 * through whole.
 *
 * The kits come from `scripts/kits.mjs`, and each is read in its own
 * framework's sources and templates: the layers it may build on are
 * `@adapttable/core` plus its framework's binding, and the header rule is
 * spelled in that framework's syntax.
 *
 *   node scripts/check-feature-parity.mjs
 *
 * `--report` prints, for each private kit measured against a reference kit,
 * the subpaths the reference exports and the kit does not — with the features
 * each one carries — and what this check would say about the kit's own files,
 * then exits 0.
 */
import { readFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { REPORT_REFERENCES } from "./check-parts-parity.mjs";
import {
  bindingDir,
  coreDir,
  frameworkFiles,
  isTemplate,
  kitDir,
  kitRegistryErrors,
  KITS,
  kitSourceDirs,
  packageNameAt,
  participatingKits,
} from "./kits.mjs";
import { REPO_ROOT } from "./packages.mjs";

/** `/preset` ships on every kit but is not a feature entry in the manifest. */
const EXTRA_SUBPATHS = ["./preset"];

/**
 * Core states a header cell's props once and every kit has to put the whole
 * object on its own element. A kit that reads named fields off it instead
 * drops whatever core adds next, silently: `role` and `scope` reached four
 * kits out of eight that way, and nothing failed, because the table still
 * looked right.
 *
 * Two shapes satisfy this, each spelled in the kit's framework — spreading
 * `leaf.headerProps` onto the header element, or handing the binding's
 * `getHeaderCellProps` to a kit that builds its own header (antd's
 * `onHeaderCell` is the whole of its `<th>`). React spreads in JSX; a Vue
 * template binds the object whole with `v-bind`; Angular uses `adaptAttrs`.
 * Angular's desktop assembly first preserves both table and grid attrs whole,
 * then its paired template binds the merged record to the header element.
 * A framework with no entry has no rule yet, and its kits fail until one is
 * written.
 */
const HEADER_RULES = {
  react: {
    spread: /\.\.\.leaf\.headerProps(?!\s*\[)/,
    handoff: /getHeaderCellProps/,
  },
  vue: {
    spread: /v-bind=["']leaf\.headerProps["']|\.\.\.leaf\.headerProps(?!\s*\[)/,
    handoff: /getHeaderCellProps/,
  },
  angular: {
    spread: /<th\b[^>]*\[adaptAttrs\]\s*=\s*(["'])leaf\.headerProps\1/,
    assembly: angularHeaderHandoff,
  },
};
const HEADER_NAMED = /leaf\.headerProps\s*\[/;

/**
 * The Angular desktop header's two halves must agree: a call to the getter
 * alone proves nothing when the template later copies only named fields.
 * Keep this tied to the real component and its configured sibling template,
 * rather than accepting an unused attrs helper elsewhere in the package.
 */
function angularHeaderHandoff(files) {
  const source = files.get("src/components/desktopTable.ts") ?? "";
  const template = files.get("src/components/desktopTable.html") ?? "";
  if (!/templateUrl\s*:\s*(["'])\.\/desktopTable\.html\1/.test(source)) {
    return false;
  }
  const body = source.match(
    /\bheaderCells\s*=\s*computed\(\(\)\s*=>\s*\{([\s\S]*?)\breturn\s+cells\s*;\s*\}\)/
  )?.[1];
  if (!body) return false;
  const compact = body.replace(/\s/g, "");
  const wholeBase = compact.includes(
    "constbase=view.grid?view.grid.headerCellAttrs(column,index):view.table.headerCellAttrs(column);"
  );
  const wholeMerge =
    /cells\.set\(column\.key,panel===undefined\|\|column\.groupable===false\?base:\{\.\.\.base,\.\.\.panel\.headerDragProps\(column\.key\),?\},?\)/.test(
      compact
    );
  const wholeBinding =
    /<th\b[^>]*\[adaptAttrs\]\s*=\s*(["'])\s*headerCells\(\)\.get\(column\.key\)!?\s*\1/.test(
      template
    );
  return wholeBase && wholeMerge && wholeBinding;
}

/**
 * The root table's file name, without its framework's extension, in any
 * casing: a React kit's `DataTable.tsx`, an Angular kit's `dataTable.ts`.
 */
const ROOT_TABLE = "datatable";

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

/** Every span between `open` and `close` removed, markers included. */
function stripBetween(source, open, close) {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const at = source.indexOf(open, index);
    if (at === -1) return out + source.slice(index);
    out += source.slice(index, at);
    const end = source.indexOf(close, at + open.length);
    if (end === -1) return out;
    index = end + close.length;
  }
  return out;
}

/**
 * A template's code: its markup without HTML comments, and each `<script>`
 * block without its script comments. A `//` in markup is part of a URL, not a
 * comment, so script comments are stripped only where script is.
 */
function stripTemplateComments(source) {
  const markup = stripBetween(source, "<!--", "-->");
  let out = "";
  let index = 0;
  while (index < markup.length) {
    const open = markup.indexOf("<script", index);
    if (open === -1) return out + markup.slice(index);
    const body = markup.indexOf(">", open) + 1;
    const close = markup.indexOf("</script>", body);
    if (body === 0 || close === -1) return out + markup.slice(index);
    out += markup.slice(index, body) + stripComments(markup.slice(body, close));
    index = close;
  }
  return out;
}

const ADAPTTABLE_IMPORT = /from\s+["'](@adapttable\/[^"']+)["']/g;
const FEATURES_BARREL =
  /from\s+["'](?:\.\/features|@adapttable\/[^"']+\/features)["']/;

/** True when `specifier` names `pkg` itself or one of its subpaths. */
function isFrom(specifier, pkg) {
  return specifier === pkg || specifier.startsWith(`${pkg}/`);
}

/** The feature subpaths every kit exports. */
function subpathsOf(manifest) {
  return [
    ...new Set(
      Object.values(manifest.features).map((feature) => `./${feature.subpath}`)
    ),
    ...EXTRA_SUBPATHS,
  ].sort();
}

/**
 * The layers a kit is built ON: the neutral engine and its framework's
 * binding, either at any subpath, and the kit's own package — an Angular
 * kit's secondary entry reaches its primary entry by package name. A kit that
 * renders another kit restyled builds on that kit too — shadcn's kit IS
 * unstyled's components restyled. Everything else under `@adapttable/` is
 * another kit's pixels, which is what this rule keeps out.
 */
function layersOf(kit, kits, root) {
  const layers = [
    packageNameAt(coreDir(root)),
    packageNameAt(bindingDir(kit.framework, root)),
    packageNameAt(kitDir(kit, root)),
  ];
  const base = kits.find((other) => other.name === kit.base);
  if (kit.role === "derived" && base) {
    layers.push(packageNameAt(kitDir(base, root)));
  }
  return layers;
}

/** A file's code, with the comments its own syntax writes removed. */
function codeOf(file, framework) {
  const source = readFileSync(file, "utf8");
  return isTemplate(file, framework)
    ? stripTemplateComments(source)
    : stripComments(source);
}

/** A header-props problem in one file, if it reads the props by name. */
function headerProblems(text, rel, rule) {
  return HEADER_NAMED.test(text) && !rule?.spread.test(text)
    ? [`${rel}: reads named fields off leaf.headerProps without spreading it`]
    : [];
}

/** Every `@adapttable/` import in one file that is not a layer the kit builds on. */
function importProblems(text, rel, allowed) {
  const specifiers = new Set(
    [...text.matchAll(ADAPTTABLE_IMPORT)].map((match) => match[1])
  );
  return [...specifiers]
    .filter((specifier) => !allowed.some((layer) => isFrom(specifier, layer)))
    .map((specifier) => `${rel}: imports sibling kit ${specifier}`);
}

/** Every problem in one kit's files, and whether it passes header props. */
function fileProblems(kit, kits, root) {
  const problems = [];
  const rule = HEADER_RULES[kit.framework];
  const allowed = layersOf(kit, kits, root);
  const packagesRoot = join(root, "packages");
  let passesHeaderProps = false;
  const code = new Map();
  const files = kitSourceDirs(kit, root).flatMap((dir) =>
    frameworkFiles(dir, kit.framework)
  );
  for (const file of files) {
    // An import in a doc comment is an EXAMPLE — `@adapttable/mui/preset` in
    // the preset's own usage block is what a reader types, not what this
    // module pulls in. Scan the code.
    const text = codeOf(file, kit.framework);
    code.set(relative(kitDir(kit, root), file).split("\\").join("/"), text);
    const rel = relative(packagesRoot, file).split("\\").join("/");
    if (rule && (rule.spread.test(text) || rule.handoff?.test(text))) {
      passesHeaderProps = true;
    }
    problems.push(
      ...headerProblems(text, rel, rule),
      ...importProblems(text, rel, allowed)
    );
    if (
      basename(file, extname(file)).toLowerCase() === ROOT_TABLE &&
      FEATURES_BARREL.test(text)
    ) {
      problems.push(`${rel}: root table imports the features aggregate barrel`);
    }
  }
  if (rule?.assembly?.(code)) passesHeaderProps = true;
  return { problems, passesHeaderProps };
}

/** A kit's manifest, read from its package folder. */
const manifestOf = (kit, root) =>
  JSON.parse(readFileSync(join(kitDir(kit, root), "package.json"), "utf8"));

/**
 * Every problem with one kit: a subpath it does not export, and what its own
 * files do wrong.
 */
function kitProblems(kit, kits, root, subpaths) {
  const pkg = manifestOf(kit, root);
  const exports = pkg.exports ?? {};
  const problems = subpaths
    .filter((subpath) => !(subpath in exports))
    .map((subpath) => `${pkg.name}: missing export ${subpath}`);
  const files = fileProblems(kit, kits, root);
  problems.push(...files.problems);
  // A kit that renders another kit restyled has no header of its own.
  if (kit.role === "derived" || files.passesHeaderProps) return problems;
  problems.push(
    HEADER_RULES[kit.framework]
      ? `${pkg.name}: never passes core's header-cell props to its header element`
      : `${pkg.name}: no header-props rule for ${kit.framework} in scripts/check-feature-parity.mjs`
  );
  return problems;
}

/**
 * Every feature-parity problem across the participating kits.
 *
 * @param {object} [options] everything the check reads, for fixtures
 * @param {string} [options.root] repository root
 * @param {readonly import("./kits.mjs").Kit[]} [options.kits] the kit registry
 * @param {{ features: Record<string, { subpath: string }> }} [options.manifest]
 *   the feature classification
 * @returns {{ problems: string[], kits: number, subpaths: number }}
 */
export function checkFeatureParity({
  root = REPO_ROOT,
  kits = KITS,
  manifest = JSON.parse(
    readFileSync(join(root, "scripts", "feature-classification.json"), "utf8")
  ),
} = {}) {
  const registry = kitRegistryErrors(root, kits);
  const participating = participatingKits(kits).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const subpaths = subpathsOf(manifest);
  if (registry.length > 0) {
    return {
      problems: registry.map((error) => `kit registry: ${error}`),
      kits: participating.length,
      subpaths: subpaths.length,
    };
  }

  const problems = participating.flatMap((kit) =>
    kitProblems(kit, kits, root, subpaths)
  );
  return { problems, kits: participating.length, subpaths: subpaths.length };
}

/** Subpaths every package exports whatever it ships. */
const PACKAGE_SUBPATHS = new Set([".", "./package.json"]);

/**
 * What each private kit still lacks against its reference: every subpath the
 * reference exports and the kit does not, with the manifest features on it,
 * and the problems this check finds in the kit's own files.
 *
 * @param {object} [options] everything the report reads, for fixtures
 * @param {string} [options.root] repository root
 * @param {readonly import("./kits.mjs").Kit[]} [options.kits] the kit registry
 * @param {Record<string, string>} [options.references] private kit → reference kit
 * @param {{ features: Record<string, { id: string, subpath: string }> }} [options.manifest]
 *   the feature classification
 * @returns {{ kit: string, reference: string, subpaths: { subpath: string, features: string[] }[], problems: string[] }[]}
 */
export function featureGapReport({
  root = REPO_ROOT,
  kits = KITS,
  references = REPORT_REFERENCES,
  manifest = JSON.parse(
    readFileSync(join(root, "scripts", "feature-classification.json"), "utf8")
  ),
} = {}) {
  const byName = new Map(kits.map((kit) => [kit.name, kit]));
  const featuresOn = (subpath) =>
    Object.values(manifest.features)
      .filter((feature) => `./${feature.subpath}` === subpath)
      .map((feature) => feature.id)
      .sort();
  return kits
    .filter((kit) => kit.role === "private" && byName.has(references[kit.name]))
    .map((kit) => {
      const reference = byName.get(references[kit.name]);
      const has = manifestOf(kit, root).exports ?? {};
      const subpaths = Object.keys(manifestOf(reference, root).exports ?? {})
        .filter(
          (subpath) => !PACKAGE_SUBPATHS.has(subpath) && !(subpath in has)
        )
        .sort()
        .map((subpath) => ({ subpath, features: featuresOn(subpath) }));
      return {
        kit: kit.name,
        reference: reference.name,
        subpaths,
        problems: kitProblems(kit, kits, root, []),
      };
    });
}

/** Print the gap report: one block per private kit. */
function printReport() {
  for (const { kit, reference, subpaths, problems } of featureGapReport()) {
    console.log(
      `${kit} is missing ${subpaths.length} subpath(s) ${reference} exports:`
    );
    for (const { subpath, features } of subpaths) {
      console.log(
        features.length > 0
          ? `  ${subpath} — ${features.join(", ")}`
          : `  ${subpath}`
      );
    }
    console.log(`${kit}: ${problems.length} problem(s) in its own files:`);
    for (const problem of problems) console.log(`  ${problem}`);
  }
}

function main() {
  const { problems, kits, subpaths } = checkFeatureParity();
  if (problems.length > 0) {
    console.error(`feature parity: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `feature parity: ${kits} kits share ${subpaths} subpaths ` +
      `and pass core's header props through whole`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--report")) printReport();
  else main();
}
