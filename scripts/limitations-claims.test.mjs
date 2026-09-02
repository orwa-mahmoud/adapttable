import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { sidebarSlugs } from "../apps/docs/sidebar.mjs";
import { DESCRIPTIONS, TITLES } from "../apps/docs/sync-docs.mjs";
import { DOCS } from "./build-llms-full.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PAGE = join(ROOT, "docs/limitations.md");

const EVIDENCE = [
  ["docs/cell-editing.md", "The table never writes to a row"],
  ["docs/row-reordering.md", '"never"'],
  ["docs/formulas.md", "1e5"],
  ["docs/data-tiers.md", "fullDataset"],
  ["docs/agent-capabilities.md", "rows.read"],
  ["docs/virtualization.md", "24"],
  ["docs/exporting.md", "EXPORT_FETCH_ALL_MAX_ROWS"],
  ["docs/ssr-rsc.md", "forceMobile"],
  ["docs/getting-started.md", "22.12.0"],
  ["docs/accessibility.md", "forced-colors"],
  ["packages/ai/src/session.ts", "readMaxOf"],
  ["packages/ai/src/session.governed.test.ts", "readMax"],
  ["packages/core/src/export/tableCsv.ts", "EXPORT_FETCH_ALL_MAX_ROWS"],
  ["scripts/consumer-fixtures.mjs", "PLAIN_ADAPTER_CEILING_KB"],
  ["scripts/bundle-budget.mjs", "PLAIN_ADAPTER_CEILING_KB"],
  ["scripts/ai-isolation.mjs", "createAgentSession"],
  ["scripts/v3-perf-baseline.json", "firstRenderMs"],
  ["playwright.config.ts", 'name: "chromium"'],
  ["e2e/aria-parity.spec.ts", "every body gridcell shares its columnheader"],
];

const FORBIDDEN_PHRASES = [
  /60\s*[–-]\s*70/,
  /\bcoming soon\b/i,
  /\bon the roadmap\b/i,
  /\buntil v3\b/i,
  /\bin a later (major|release)\b/i,
  /\bplanned for\b/i,
  /\bTODO\b/,
  /\bFIXME\b/,
];

const FORBIDDEN_HEADING_WORDS = /\b(old|legacy|fallback|backward)\b/i;

function headingsOf(markdown) {
  return markdown
    .split("\n")
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, ""));
}

describe("limitations page claims", () => {
  const page = readFileSync(PAGE, "utf8");

  it("exists as present-tense fact, not a plan", () => {
    assert.match(page, /^# Limitations and boundaries\n/);
    assert.match(page, /This page is not a roadmap\./);
    assert.match(page, /## Sources\n/);
    for (const phrase of FORBIDDEN_PHRASES) {
      assert.equal(
        phrase.test(page),
        false,
        `page contains forbidden phrase ${phrase}`
      );
    }
    for (const heading of headingsOf(page)) {
      assert.equal(
        FORBIDDEN_HEADING_WORDS.test(heading),
        false,
        `heading uses a forbidden word: ${heading}`
      );
    }
  });

  it("cites evidence files that exist and carry the claimed token", () => {
    for (const [rel, token] of EVIDENCE) {
      const path = join(ROOT, rel);
      assert.equal(existsSync(path), true, `missing evidence file ${rel}`);
      assert.ok(
        readFileSync(path, "utf8").includes(token),
        `${rel} does not contain ${JSON.stringify(token)}`
      );
    }
    assert.match(page, /readMaxOf/);
    assert.match(page, /PLAIN_ADAPTER_CEILING_KB/);
    assert.match(page, /EXPORT_FETCH_ALL_MAX_ROWS/);
    assert.match(page, /playwright\.config\.ts/);
    assert.match(page, /e2e\/aria-parity\.spec\.ts/);
    assert.match(page, /scripts\/v3-perf-baseline\.json/);
    assert.match(page, /scripts\/ai-isolation\.mjs/);
  });

  it("is registered on every public docs surface", () => {
    assert.ok(DOCS.includes("limitations.md"));
    assert.ok("limitations.md" in TITLES);
    assert.ok("limitations.md" in DESCRIPTIONS);
    assert.ok(sidebarSlugs().includes("limitations"));
    const llms = readFileSync(join(ROOT, "llms.txt"), "utf8");
    assert.ok(llms.includes("/adapttable/limitations/"));
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    assert.ok(readme.includes("/adapttable/limitations/"));
    const comparison = readFileSync(join(ROOT, "docs/comparison.md"), "utf8");
    assert.ok(comparison.includes("./limitations.md"));
  });
});
