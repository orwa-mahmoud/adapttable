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
import { packageRel, REPO_ROOT as ROOT } from "./packages.mjs";

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
const GRAPH_PACKAGES = [
  CORE,
  ...frameworksIn(publishedKits(KITS)).map(
    (framework) => FRAMEWORKS[framework].binding
  ),
  "server",
  ...publishedKits(KITS).map((kit) => kit.name),
];

/** Each root graph, as a path relative to the repository root. */
const GRAPHS = GRAPH_PACKAGES.map(
  (name) => `${packageRel(name)}/dist/index.js`
);

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
