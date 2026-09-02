/**
 * Prove the optional AI package is absent from the base graphs.
 *
 *   node scripts/ai-isolation.mjs
 *
 * `@adapttable/core`, `@adapttable/core/adapter`, every published adapter
 * root and `@adapttable/server` must not mention the agent protocol. A
 * table pays for discovery only when it imports `@adapttable/ai`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARKERS = [
  "createAgentSession",
  "tableAgent",
  "adapttable.agent.v1",
  "@adapttable/ai",
];

const GRAPHS = [
  "packages/core/dist/index.js",
  "packages/core/dist/adapter.js",
  "packages/server/dist/index.js",
  "packages/adapter-mantine/dist/index.js",
  "packages/adapter-mui/dist/index.js",
  "packages/adapter-chakra/dist/index.js",
  "packages/adapter-antd/dist/index.js",
  "packages/adapter-radix/dist/index.js",
  "packages/adapter-base-ui/dist/index.js",
  "packages/adapter-shadcn/dist/index.js",
  "packages/adapter-unstyled/dist/index.js",
];

const leaked = [];
for (const file of GRAPHS) {
  const text = readFileSync(join(ROOT, file), "utf8");
  for (const marker of MARKERS) {
    if (text.includes(marker)) leaked.push(`${file} contains ${marker}`);
  }
}

if (leaked.length) {
  console.error(`✗ AI leaked into a base graph:\n${leaked.join("\n")}`);
  process.exit(1);
}
console.log(
  `✓ ${GRAPHS.length} base graphs contain none of ${MARKERS.join(", ")}`
);
