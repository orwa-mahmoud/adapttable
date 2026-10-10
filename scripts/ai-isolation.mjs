/**
 * Prove the optional AI package is absent from the base graphs.
 *
 *   node scripts/ai-isolation.mjs
 *
 * `@adapttable/core`, every implemented binding and adapter root, and
 * `@adapttable/server` must not mention the agent protocol. A table pays for
 * discovery only when it imports `@adapttable/ai`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { CORE, FRAMEWORKS, KITS, participatingKits } from "./kits.mjs";
import { buildPkgDirByName, walkGraph } from "./module-graph.mjs";
import {
  listPackages,
  packageDir,
  packageRel,
  REPO_ROOT as ROOT,
} from "./packages.mjs";

const MARKERS = [
  "createAgentSession",
  "tableAgent",
  "adapttable.agent.v1",
  "@adapttable/ai",
  // The optional subpaths added for the protocol adapters. A root graph that
  // mentions one of these has pulled an integration nobody asked for.
  "createTableAssistant",
  "buildAgentContext",
  "registerWebMcpTools",
  "aguiTransport",
  "aiSdkTransport",
  "createMcpAppBridge",
];

/**
 * The package folders whose root graph must stay free of the agent protocol:
 * the engine, every existing framework binding, the server, and participating
 * or implemented non-React kits in `scripts/kits.mjs`.
 */
/** The JavaScript branch of an exports entry, without guessing the build format. */
export function moduleEntry(entry) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return undefined;
  for (const condition of ["import", "default"]) {
    const found = moduleEntry(entry[condition]);
    if (found) return found;
  }
  return undefined;
}

/** Every advertised JavaScript condition, including require and browser builds. */
export function moduleEntries(entry, into = new Set()) {
  if (typeof entry === "string") {
    if (/\.[cm]?js$/.test(entry)) into.add(entry);
    return [...into];
  }
  if (!entry || typeof entry !== "object") return [...into];
  for (const [condition, value] of Object.entries(entry)) {
    if (!condition.startsWith("types")) moduleEntries(value, into);
  }
  return [...into];
}

function manifestOf(name, root = ROOT) {
  return JSON.parse(
    readFileSync(join(packageDir(name, root), "package.json"), "utf8")
  );
}

/**
 * Discover every existing binding, even before its first kit participates.
 * Implemented private non-React kits owe isolation proof as they grow; the
 * private React reference remains outside kit contracts under its existing role.
 * A placeholder with no root export does not claim an implemented graph.
 */
export function baseGraphPaths(root = ROOT, kits = KITS) {
  const bindings = listPackages(root)
    .filter((pkg) => FRAMEWORKS[pkg.group]?.binding === pkg.name)
    .map((pkg) => pkg.name);
  const implementedKits = kits.filter(
    (kit) =>
      kit.framework !== "react" &&
      moduleEntries(manifestOf(kit.name, root).exports?.["."]).length > 0
  );
  const names = new Set([
    CORE,
    ...bindings,
    "server",
    ...[...participatingKits(kits), ...implementedKits].map((kit) => kit.name),
  ]);
  return [...names].flatMap((name) => {
    const entries = moduleEntries(manifestOf(name, root).exports?.["."]);
    if (entries.length === 0)
      throw new Error(`No JavaScript root export declared by ${name}`);
    return entries.map(
      (entry) => `${packageRel(name, root)}/${entry.replace(/^\.\//u, "")}`
    );
  });
}

/** Each root graph, following every declared JavaScript condition. */
const GRAPHS = baseGraphPaths();

/**
 * Every marker one graph's text carries.
 *
 * Separated from the reading so the rule can be exercised without a build:
 * the test owns this, and the build output is what the gate runs it over.
 */
export function leaksIn(file, text) {
  return MARKERS.filter((marker) => text.includes(marker)).map(
    (marker) => `${file} contains ${marker}`
  );
}

/**
 * Check every base graph.
 *
 * An entry that is not there proves nothing about isolation, so it is a
 * failure named in full rather than a graph quietly skipped — a pass over
 * eleven graphs must mean eleven graphs were read.
 */
export function checkGraphs(graphs = GRAPHS, root = ROOT) {
  const leaked = [];
  const missing = [];
  const pkgDirByName = buildPkgDirByName(root);
  for (const file of graphs) {
    const entry = join(root, file);
    if (!existsSync(entry)) {
      missing.push(file);
      continue;
    }
    const graph = walkGraph([entry], pkgDirByName);
    for (const unresolved of graph.unresolved) {
      missing.push(`${file} has unresolved import ${unresolved}`);
    }
    for (const reached of graph.files) {
      const path = relative(root, reached).replaceAll("\\", "/");
      const label = reached === entry ? file : `${file} reaches ${path}`;
      leaked.push(...leaksIn(label, readFileSync(reached, "utf8")));
    }
  }
  return { leaked, missing };
}

export { GRAPHS, MARKERS };

function main() {
  const { leaked, missing } = checkGraphs();
  if (missing.length) {
    console.error(
      `\u2717 not built, so isolation is unproven:\n${missing.join("\n")}\n` +
        "Run `pnpm build` first — this check reads the built graphs."
    );
    process.exit(1);
  }
  if (leaked.length) {
    console.error(`\u2717 AI leaked into a base graph:\n${leaked.join("\n")}`);
    process.exit(1);
  }
  console.log(
    `\u2713 ${GRAPHS.length} base graphs contain none of ${MARKERS.join(", ")}`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
