/**
 * The advertised locale count must match the locales that ship.
 *
 * Feature pages say "every bundled locale" and need no maintenance. The files
 * below sell the number instead — a headline, a package description, a README
 * row — so adding a locale has to update them, and this test is what says so
 * rather than a reader noticing months later.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = join(ROOT, "packages", "i18n", "src", "locales");

/** Files that name the count, and how many times each says it. */
const ADVERTISED = [
  { file: "README.md", occurrences: 2 },
  { file: "docs/faq.md", occurrences: 1 },
  { file: "docs/i18n-rtl.md", occurrences: 1 },
  { file: "llms.txt", occurrences: 3 },
  { file: "packages/i18n/README.md", occurrences: 1 },
  { file: "packages/i18n/package.json", occurrences: 1 },
  { file: "packages/i18n/src/index.ts", occurrences: 1 },
];

function shippedLocales() {
  return readdirSync(LOCALES).filter((name) => name.endsWith(".ts")).length;
}

describe("advertised locale count", () => {
  const count = shippedLocales();

  it("counts the locales that ship", () => {
    assert.ok(count > 0);
  });

  for (const { file, occurrences } of ADVERTISED) {
    const times = occurrences === 1 ? "once" : `${occurrences} times`;
    it(`${file} names the count ${times}`, () => {
      const text = readFileSync(join(ROOT, file), "utf8");
      // The count only counts when it is counting locales — "React 18" is not
      // an advertised locale count.
      const claim = new RegExp(`\\b${count}\\s+(?:locale|language)s?\\b`, "g");
      const found = text.match(claim) ?? [];
      assert.equal(
        found.length,
        occurrences,
        `${file} should name ${count} locales ${occurrences}×, found ${found.length}. ` +
          `Adding a locale means updating this copy — or drop the number and say ` +
          `"every bundled locale" the way the feature pages do.`
      );
    });
  }

  it("leaves no stale spelled-out count in the docs", () => {
    const words = ["seventeen", "eighteen", "nineteen", "twenty"];
    const pages = readdirSync(join(ROOT, "docs")).filter((f) =>
      f.endsWith(".md")
    );
    for (const page of pages) {
      const text = readFileSync(join(ROOT, "docs", page), "utf8").toLowerCase();
      for (const word of words) {
        assert.ok(
          !text.includes(`${word} locale`),
          `docs/${page} spells out a locale count ("${word} locale"). Say ` +
            `"every bundled locale" instead — it never needs updating.`
        );
      }
    }
  });
});
