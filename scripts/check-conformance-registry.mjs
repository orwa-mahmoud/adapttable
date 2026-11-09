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
const SKIPPED = /describe\.skip\s*\([\s\S]*tableConformanceTests\s*\(/;
const FULL_LOOP = /for\s*\(\s*const\s+test\s+of\s+tableConformanceTests\s*\(/;

/** Cases every kit runs by iterating the shared suite, not by naming them. */
export const REQUIRED_CONFORMANCE_CASES = [
  "activates a row from its body and not from an interactive control",
  "marks a flashing cell and clears it when its time passes",
  "shows the search placeholder ahead of the label",
  "asks the server for the page and shows the host rows unsorted",
];

const SUITE_FILE = join(
  "packages",
  "shared",
  "core",
  "src",
  "conformance",
  "tableConformance.ts"
);

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
 * @param {string} suiteFile
 * @param {string} root
 * @returns {{ problems: string[], cases: number }}
 */
function suiteProblems(suiteFile, root) {
  if (!existsSync(suiteFile)) {
    return {
      problems:
        suiteFile === join(root, SUITE_FILE)
          ? []
          : ["shared conformance suite is missing"],
      cases: 0,
    };
  }
  const source = readFileSync(suiteFile, "utf8");
  /** @type {string[]} */
  const problems = [];
  let cases = 0;
  for (const name of REQUIRED_CONFORMANCE_CASES) {
    if (source.includes(`it("${name}"`)) cases += 1;
    else problems.push(`shared suite is missing "${name}"`);
  }
  return { problems, cases };
}

/**
 * @param {string} label
 * @param {string} dir
 * @returns {string | undefined}
 */
function kitProblem(label, dir) {
  if (!existsSync(dir)) return `${label}: conformance suite is not registered`;
  const files = conformanceTests(dir);
  if (files.length === 0)
    return `${label}: conformance suite is not registered`;
  const text = files.map((file) => readFileSync(file, "utf8")).join("\n");
  if (!SUITE.test(text)) return `${label}: conformance suite is not registered`;
  if (SKIPPED.test(text)) return `${label}: conformance suite is skipped`;
  if (!FULL_LOOP.test(text)) {
    return `${label}: conformance suite does not run every case`;
  }
  return undefined;
}

/**
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {readonly { name: string, framework: string, role: string }[]} [options.kits]
 * @param {string} [options.suiteFile] shared suite to require the common cases from
 */
export function checkConformanceRegistry({
  root = REPO_ROOT,
  kits = participatingKits(),
  suiteFile = join(root, SUITE_FILE),
} = {}) {
  const suite = suiteProblems(suiteFile, root);
  const registered = participatingKits(kits);
  const problems = [...suite.problems];
  for (const kit of registered) {
    const problem = kitProblem(
      `${kit.framework}/${kit.name}`,
      kitDir(kit, root)
    );
    if (problem) problems.push(problem);
  }
  return { problems, kits: registered.length, cases: suite.cases };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { problems, kits, cases } = checkConformanceRegistry();
  if (problems.length > 0) {
    console.error(`conformance registry: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`conformance registry: ${kits} kits run ${cases} shared cases`);
}
