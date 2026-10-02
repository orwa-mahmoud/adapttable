/**
 * Prove the optional AI package is absent from the base graphs.
 *
 *   node scripts/ai-isolation.mjs
 *
 * `@adapttable/core`, `@adapttable/react`, every published adapter root and
 * `@adapttable/server` must not mention the agent protocol. A table pays for
 * discovery only when it imports `@adapttable/ai`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  CORE,
  FRAMEWORKS,
  frameworksIn,
  KITS,
  publishedKits,
} from "./kits.mjs";
import { packageDir, packageRel, REPO_ROOT as ROOT } from "./packages.mjs";

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
 * the engine, the binding of every framework a published kit is built on, the
 * server, and every published kit in `scripts/kits.mjs`.
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

function manifestOf(name) {
  return JSON.parse(
    readFileSync(join(packageDir(name), "package.json"), "utf8")
  );
}

// Angular's implemented kits must prove isolation before the campaign promotes
// them to native/shell. Placeholder manifests have no root entry yet.
const angularKits = KITS.filter(
  (kit) =>
    kit.framework === "angular" &&
    moduleEntry(manifestOf(kit.name).exports?.["."])
);
const guardedKits = [
  ...new Map(
    [...publishedKits(KITS), ...angularKits].map((kit) => [kit.name, kit])
  ).values(),
];
const GRAPH_PACKAGES = [
  CORE,
  ...frameworksIn(guardedKits).map(
    (framework) => FRAMEWORKS[framework].binding
  ),
  "server",
  ...guardedKits.map((kit) => kit.name),
];

/** Each root graph, following the package's declared JavaScript entry. */
const GRAPHS = GRAPH_PACKAGES.map((name) => {
  const entry = moduleEntry(manifestOf(name).exports?.["."]);
  if (!entry) throw new Error(`No JavaScript root export declared by ${name}`);
  return `${packageRel(name)}/${entry.replace(/^\.\//u, "")}`;
});

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

/** A graph's text, or nothing when that entry was never built. */
function readGraph(file) {
  try {
    return readFileSync(join(ROOT, file), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

/**
 * Check every base graph.
 *
 * An entry that is not there proves nothing about isolation, so it is a
 * failure named in full rather than a graph quietly skipped — a pass over
 * eleven graphs must mean eleven graphs were read.
 */
export function checkGraphs(graphs = GRAPHS) {
  const leaked = [];
  const missing = [];
  for (const file of graphs) {
    const text = readGraph(file);
    if (text === undefined) missing.push(file);
    else leaked.push(...leaksIn(file, text));
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
