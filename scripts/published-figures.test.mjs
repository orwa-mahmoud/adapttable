import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
  decimalsOf,
  expectedFigures,
  figureBefore,
  figuresIn,
  publishedFigures,
  roundTo,
  staleReason,
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

describe("decimalsOf", () => {
  it("reads the precision a page chose", () => {
    assert.equal(decimalsOf(18), 0);
    assert.equal(decimalsOf(2.7), 1);
    assert.equal(decimalsOf(1.55), 2);
  });
});

describe("roundTo", () => {
  it("rounds at the precision asked for", () => {
    assert.equal(roundTo(17.8, 0), 18);
    assert.equal(roundTo(2.74, 1), 2.7);
    assert.equal(roundTo(1.55, 1), 1.6);
  });
});

describe("expectedFigures", () => {
  it("rounds a single measurement the way the pages write it", () => {
    assert.deepEqual(expectedFigures([17.8]), [18]);
    assert.deepEqual(expectedFigures([86.9]), [87]);
    assert.deepEqual(expectedFigures([0.8]), [1]);
  });

  it("rounds each end of a range on its own", () => {
    assert.deepEqual(
      expectedFigures([127.1, 134.3, 141.1], [0, 0]),
      [127, 141]
    );
  });

  it("collapses a range whose ends round to the same number", () => {
    assert.deepEqual(expectedFigures([133.2, 133.4]), [133]);
  });

  // A page that writes `1.5 KB` is more accurate than one writing `2 kB`, so
  // the rule holds it to a decimal rather than demanding it round away.
  it("keeps the precision the page publishes at", () => {
    assert.deepEqual(expectedFigures([1.5], [1]), [1.5]);
    assert.deepEqual(expectedFigures([2.74], [1]), [2.7]);
  });
});

describe("staleReason", () => {
  it("passes a figure that is the measurement, rounded", () => {
    assert.equal(staleReason([18], [17.8]), null);
    assert.equal(staleReason([87], [86.9]), null);
  });

  it("passes a one-decimal figure against its own precision", () => {
    assert.equal(staleReason([1.5], [1.5]), null);
    assert.equal(staleReason([2.7], [2.74]), null);
  });

  it("fails a one-decimal figure that no longer matches", () => {
    assert.match(
      staleReason([1.5], [1.9]),
      /published 1.5 kB, expected 1.9 kB/
    );
  });

  // The rule the pages state is `published === Math.round(measured)`. A window
  // around it is how a number drifts a kilobyte at a time while every run stays
  // green, which is the opposite of what "cannot quietly go stale" promises.
  it("fails a figure one kilobyte low", () => {
    assert.match(staleReason([17], [17.8]), /published 17 kB, expected 18 kB/);
  });

  it("fails a figure one kilobyte high", () => {
    assert.match(staleReason([19], [17.8]), /published 19 kB, expected 18 kB/);
  });

  it("passes a range whose ends both round correctly", () => {
    assert.equal(staleReason([127, 141], [127.1, 134.3, 141.1]), null);
  });

  it("fails a range whose LOW end is wrong, however right the high one is", () => {
    assert.match(
      staleReason([126, 141], [127.1, 141.1]),
      /published 126–141 kB, expected 127–141 kB/
    );
  });

  it("fails a range whose HIGH end is wrong, however right the low one is", () => {
    assert.match(
      staleReason([127, 140], [127.1, 141.1]),
      /published 127–140 kB, expected 127–141 kB/
    );
  });

  it("fails a single figure where a range belongs, and says so", () => {
    assert.match(
      staleReason([127], [127.1, 141.1]),
      /published 127, expected 127–141 kB/
    );
  });

  it("names the measurement so the fix is obvious", () => {
    assert.match(staleReason([140], [141.1]), /measured 141.1 KB/);
  });
});
