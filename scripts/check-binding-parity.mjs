#!/usr/bin/env node
/**
 * Hold the three bindings to one shape: each shared entry point exports the
 * same names (read through each framework's idiom), and every name that is
 * not in all three is listed in `scripts/binding-parity-allow.json` with a
 * reason. `--write-allow-list` records the current divergences as pending.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { bindingEntries, parityProblems } from "./binding-parity.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT = join(ROOT, "etc", "api-contract.json");
const ALLOW = join(ROOT, "scripts", "binding-parity-allow.json");
const PENDING = "pending: shared-surface decision";

const contract = JSON.parse(readFileSync(CONTRACT, "utf8"));
const allow = JSON.parse(readFileSync(ALLOW, "utf8"));
const entries = bindingEntries(contract.surfaces);
const { problems, divergent } = parityProblems(entries, allow);

if (process.argv.includes("--write-allow-list")) {
  const names = {};
  for (const [fw, byEntry] of Object.entries(divergent)) {
    names[fw] = {};
    for (const [entry, list] of Object.entries(byEntry))
      names[fw][entry] = Object.fromEntries(
        list.map((name) => [
          name,
          allow.names?.[fw]?.[entry]?.[name] ?? PENDING,
        ])
      );
  }
  writeFileSync(ALLOW, `${JSON.stringify({ ...allow, names }, null, 2)}\n`);
  console.log("binding-parity: allow-list written.");
} else if (problems.length > 0) {
  console.error(`\n✗ binding-parity: ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
} else {
  const count = Object.values(divergent)
    .flatMap((byEntry) => Object.values(byEntry))
    .reduce((sum, list) => sum + list.length, 0);
  console.log(
    `binding-parity: every shared entry agrees across React, Vue and Angular; ${count} allow-listed name(s).`
  );
}
