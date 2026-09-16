#!/usr/bin/env node
/**
 * Hold the v3 package-split map to the committed public contract.
 *
 * Every current public symbol must appear exactly once per import specifier,
 * classified, with a destination. Representative engine / React / kit / AI
 * examples must agree with the frozen contracts in ARCHITECTURE.md.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  representativeExamplesAgree,
  splitMapErrors,
} from "./package-split-map.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAP = join(ROOT, "scripts", "v3-package-split-map.json");
const MANIFEST = join(ROOT, "etc", "api-contract.json");

const map = JSON.parse(readFileSync(MAP, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const errors = [
  ...splitMapErrors(map, manifest),
  ...representativeExamplesAgree(map),
];

if (errors.length > 0) {
  console.error(`\n✗ package-split-map: ${errors.length} disagreement(s):\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(
  `package-split-map: ${map.symbols.length} public symbol(s) mapped; ` +
    `engine / React / kit / AI examples agree.`
);
