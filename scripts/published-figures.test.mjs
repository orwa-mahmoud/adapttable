import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
  figureBefore,
  figuresIn,
  publishedFigures,
} from "./published-figures.mjs";

const dir = mkdtempSync(join(tmpdir(), "published-figures-"));
after(() => rmSync(dir, { recursive: true, force: true }));

/** Write a page and return its path. */
function page(name, lines) {
  const file = join(dir, name);
  writeFileSync(file, `${lines.join("\n")}\n`);
  return file;
}

describe("figuresIn", () => {
  it("reads a single figure, with or without a tilde", () => {
    assert.deepEqual(figuresIn("| every core export | ~87 kB |"), [87]);
    assert.deepEqual(figuresIn("It costs 2.7 KB gzipped to the tables"), [2.7]);
  });

  it("reads both ends of a range", () => {
    assert.deepEqual(figuresIn("| an adapter | ~127–140 kB |"), [127, 140]);
    assert.deepEqual(figuresIn("~51-57 kB"), [51, 57]);
  });

  it("reads every figure on the line, in order", () => {
    assert.deepEqual(figuresIn("was ~10 kB, now 17.8 KB"), [10, 17.8]);
  });

  it("is empty when the unit carries no number", () => {
    assert.deepEqual(figuresIn("a few kB either way"), []);
    assert.deepEqual(figuresIn("no unit here at all"), []);
  });
});

describe("figureBefore", () => {
  it("takes the figure at the unit it is given, not the first on the line", () => {
    const text = "10 kB became 17.8 KB";
    assert.deepEqual(figureBefore(text, text.lastIndexOf("KB")), [17.8]);
  });
});

describe("publishedFigures", () => {
  it("finds a table row by its opening cell", () => {
    const file = page("table.md", [
      "| What you import | min+gzip |",
      "| --------------- | -------- |",
      "| every core export | ~87 kB |",
    ]);
    assert.deepEqual(publishedFigures(file, "| every core export"), [87]);
  });

  it("follows prose that wraps onto the next line", () => {
    const file = page("prose.md", [
      "so an Express or Fastify service installs a",
      "1.6 KB parser and not a UI library.",
    ]);
    assert.deepEqual(
      publishedFigures(file, "so an Express or Fastify service installs a"),
      [1.6]
    );
  });

  it("stops at the row's own line, so a later row cannot answer for it", () => {
    const file = page("rows.md", [
      "| core | ~18 kB |",
      "| an adapter | ~127–140 kB |",
    ]);
    assert.deepEqual(publishedFigures(file, "| core"), [18]);
  });

  it("reports a reworded line as missing rather than as a match", () => {
    const file = page("gone.md", ["| all core exports | ~87 kB |"]);
    assert.equal(publishedFigures(file, "| every core export"), null);
  });
});
