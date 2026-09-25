import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { KITS } from "./detect";

/**
 * The set of scaffoldable UI kits is defined once, in the CLI `KITS` registry,
 * but it is also advertised in the root README package table. Those two drifted
 * apart once — Radix and shadcn shipped as adapters yet were missing from the
 * docs — and had to be reconciled by hand. This guard keeps `KITS` the single
 * source of truth: if an adapter the CLI can scaffold is ever absent from the
 * README, the gate fails here instead of shipping a quietly incomplete table.
 */
const README = readFileSync(
  fileURLToPath(new URL("../../../../README.md", import.meta.url)),
  "utf8"
);

describe("supported-kits docs stay in sync with the CLI registry", () => {
  it.each(KITS.map((k) => k.adapter))("root README documents %s", (adapter) => {
    expect(README).toContain(adapter);
  });
});
