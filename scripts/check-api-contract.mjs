#!/usr/bin/env node
/**
 * Hold the committed reports to the contract in `etc/api-contract.json`.
 *
 * Runs inside `pnpm check` and `pnpm verify:release`, so a contract violation
 * reddens the gate every push already passes through — the allowlist this
 * replaces was referenced by no script at all, and had been reported as
 * enforcement while enforcing nothing.
 *
 * Reads only what is committed: `etc/*.api.md` and the manifest. `pnpm build`
 * is not required, which is why it can run early enough to be the first thing
 * that fails.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkContract } from "./api-contract.mjs";
import { entrypoints } from "./api-entrypoints.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ETC = join(REPO_ROOT, "etc");
// The gate always reads the committed manifest. A path may be passed so the
// test suite can point the REAL binary at a tampered copy and watch it fail —
// proving the wiring, not a re-implementation of it.
const MANIFEST = process.argv[2] ?? join(ETC, "api-contract.json");

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const entries = entrypoints();
const reports = {};
for (const entry of entries) {
  const file = join(ETC, entry.report);
  if (existsSync(file)) reports[entry.report] = readFileSync(file, "utf8");
}

const errors = checkContract({ manifest, entrypoints: entries, reports });
if (errors.length > 0) {
  console.error(
    `\n✗ api-contract: ${errors.length} disagreement(s) between etc/api-contract.json and the committed reports:\n`
  );
  for (const error of errors) console.error(`  ${error}`);
  console.error(
    `\n  A new export needs a line in the manifest and a changeset saying so.\n` +
      `  A missing one is a removal or a demotion — both are major-version changes.`
  );
  process.exit(1);
}

const published = entries.filter((entry) => entry.published).length;
console.log(
  `api-contract: ${published} published entry point(s) match the contract, ` +
    `${Object.keys(manifest.surfaces).length} surface(s) in ${Object.keys(manifest.entrypoints).length} policy(s).`
);
