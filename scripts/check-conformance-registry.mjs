/**
 * Every participating kit registers the shared conformance suite.
 *
 * A kit without a conformance test, a test that never calls
 * `tableConformanceTests`, or a call wrapped in `describe.skip` fails.
 * The kit list is `scripts/kits.mjs`; this check does not keep a second one.
 *
 *   node scripts/check-conformance-registry.mjs
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { kitDir, participatingKits } from "./kits.mjs";
import { REPO_ROOT } from "./packages.mjs";

const SUITE = /tableConformanceTests\s*\(/;
const SKIPPED =
  /describe\.skip\s*\([\s\S]*tableConformanceTests\s*\(/;

/**
 * @param {string} dir
 * @param {string[]} out
 */
function conformanceTests(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) conformanceTests(path, out);
    else if (/^conformance\.test\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

/**
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {readonly { name: string, framework: string, role: string }[]} [options.kits]
 */
export function checkConformanceRegistry({
  root = REPO_ROOT,
  kits = participatingKits(),
} = {}) {
  /** @type {string[]} */
  const problems = [];
  for (const kit of participatingKits(kits)) {
    const label = `${kit.framework}/${kit.name}`;
    const dir = kitDir(kit, root);
    if (!existsSync(dir)) {
      problems.push(`${label}: conformance suite is not registered`);
      continue;
    }
    const files = conformanceTests(dir);
    if (files.length === 0) {
      problems.push(`${label}: conformance suite is not registered`);
      continue;
    }
    const text = files.map((file) => readFileSync(file, "utf8")).join("\n");
    if (!SUITE.test(text)) {
      problems.push(`${label}: conformance suite is not registered`);
    } else if (SKIPPED.test(text)) {
      problems.push(`${label}: conformance suite is skipped`);
    }
  }
  return { problems, kits: participatingKits(kits).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { problems, kits } = checkConformanceRegistry();
  if (problems.length > 0) {
    console.error(
      `conformance registry: ${problems.length} problem(s)\n`
    );
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`conformance registry: ${kits} kits register the shared suite`);
}
