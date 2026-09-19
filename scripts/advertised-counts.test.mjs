/**
 * Counts the docs advertise must match what ships.
 *
 * Prose that needs no number says "every bundled locale" or "every adapter"
 * and never goes stale. The files below sell the number instead — a headline,
 * a package description, a README row — so adding a locale or a kit has to
 * update them, and this test is what says so rather than a reader noticing
 * months later.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

/**
 * Every way a count can be written, so a page may spell it or use digits.
 *
 * @param {number} count
 * @returns {string}
 */
function numberForms(count) {
  const word = WORDS[count];
  return word === undefined ? String(count) : `(?:${count}|${word})`;
}

/**
 * @param {{ file: string, occurrences: number }[]} advertised
 * @param {number} count
 * @param {string} nouns - alternation of the nouns the count counts
 */
function checkAdvertised(advertised, count, nouns) {
  for (const { file, occurrences } of advertised) {
    const times = occurrences === 1 ? "once" : `${occurrences} times`;
    it(`${file} names the count ${times}`, () => {
      const text = readFileSync(join(ROOT, file), "utf8");
      // The count only counts when it is counting the thing — "React 18" is
      // not an advertised locale count.
      const claim = new RegExp(
        `\\b${numberForms(count)}[ -](?:${nouns})\\b`,
        "gi"
      );
      const found = text.match(claim) ?? [];
      assert.equal(
        found.length,
        occurrences,
        `${file} should name ${count} ${occurrences}×, found ${found.length}. ` +
          `Adding one means updating this copy — or drop the number and say ` +
          `"every bundled locale" / "every adapter" the way the feature pages do.`
      );
    });
  }
}

describe("advertised locale count", () => {
  const count = readdirSync(
    join(ROOT, "packages", "i18n", "src", "locales")
  ).filter((name) => name.endsWith(".ts")).length;

  it("counts the locales that ship", () => {
    assert.ok(count > 0);
  });

  checkAdvertised(
    [
      { file: "README.md", occurrences: 2 },
      { file: "docs/faq.md", occurrences: 1 },
      { file: "docs/i18n-rtl.md", occurrences: 1 },
      { file: "llms.txt", occurrences: 3 },
      { file: "packages/i18n/README.md", occurrences: 1 },
      { file: "packages/i18n/package.json", occurrences: 1 },
      { file: "packages/i18n/src/index.ts", occurrences: 1 },
    ],
    count,
    "locales?|languages?"
  );

  it("leaves no stale spelled-out count in the docs", () => {
    const pages = readdirSync(join(ROOT, "docs")).filter((f) =>
      f.endsWith(".md")
    );
    for (const page of pages) {
      const text = readFileSync(join(ROOT, "docs", page), "utf8").toLowerCase();
      for (const word of WORDS.slice(2)) {
        assert.ok(
          !text.includes(`${word} locale`),
          `docs/${page} spells out a locale count ("${word} locale"). Say ` +
            `"every bundled locale" instead — it never needs updating.`
        );
      }
    }
  });
});

describe("advertised adapter count", () => {
  // The bootstrap adapter is in the tree but unpublished, so it is not one of
  // the kits the docs count.
  const count = readdirSync(join(ROOT, "packages"))
    .filter((name) => name.startsWith("adapter-"))
    .filter((name) => {
      const pkg = JSON.parse(
        readFileSync(join(ROOT, "packages", name, "package.json"), "utf8")
      );
      return pkg.private !== true;
    }).length;

  it("counts the adapters that publish", () => {
    assert.ok(count > 0);
  });

  checkAdvertised(
    [
      { file: "CONTRIBUTING.md", occurrences: 1 },
      { file: "README.md", occurrences: 2 },
      { file: "docs/accessibility.md", occurrences: 1 },
      { file: "docs/api.md", occurrences: 1 },
      { file: "docs/cell-navigation.md", occurrences: 2 },
      { file: "docs/faq.md", occurrences: 2 },
      { file: "docs/limitations.md", occurrences: 1 },
      { file: "docs/realtime.md", occurrences: 2 },
    ],
    count,
    "adapters?|kits?"
  );
});
