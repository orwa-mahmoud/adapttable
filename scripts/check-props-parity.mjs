#!/usr/bin/env node
/**
 * Hold the three bindings' tables to one props contract: every core option
 * and every binding prop reaches a React, a Vue and an Angular table — as a
 * prop or input, or through the feature that replaces it — or is listed in
 * `scripts/props-parity-allow.json` with its reason. `--write-allow-list`
 * records the current gaps as pending, keeping existing reasons.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  coreOptions,
  declaredProps,
  PROPS_SURFACES,
  propsProblems,
} from "./props-parity.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOW = join(ROOT, "scripts", "props-parity-allow.json");
const CLASSIFICATION = join(ROOT, "scripts", "feature-classification.json");
const PENDING = "pending: shared-surface decision";

const allowFile = JSON.parse(readFileSync(ALLOW, "utf8"));
const classification = JSON.parse(readFileSync(CLASSIFICATION, "utf8"));
const featureProps = Object.values(classification.features).flatMap(
  (feature) => feature.replacesProps ?? []
);
const props = Object.fromEntries(
  PROPS_SURFACES.map((surface) => [
    surface.framework,
    declaredProps(ROOT, surface),
  ])
);
const { problems, divergent } = propsProblems({
  core: coreOptions(ROOT),
  props,
  featureProps,
  allow: allowFile.names,
});

if (process.argv.includes("--write-allow-list")) {
  const names = Object.fromEntries(
    Object.entries(divergent).map(([fw, list]) => [
      fw,
      Object.fromEntries(
        list.map((name) => [name, allowFile.names?.[fw]?.[name] ?? PENDING])
      ),
    ])
  );
  writeFileSync(ALLOW, `${JSON.stringify({ ...allowFile, names }, null, 2)}\n`);
  console.log("props-parity: allow-list written.");
} else if (problems.length > 0) {
  console.error(`\n✗ props-parity: ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
} else {
  const count = Object.values(divergent).reduce(
    (sum, list) => sum + list.length,
    0
  );
  console.log(
    `props-parity: every core option and binding prop reaches React, Vue and Angular tables; ${count} allow-listed gap(s).`
  );
}
