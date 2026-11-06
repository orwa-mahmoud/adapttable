/**
 * The server codec entry stays on the query door.
 *
 * A browser, a framework, or a local table engine in this package would mean
 * the request parser had started owning a client runtime. Tests may import
 * the root; production files may not.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC = dirname(fileURLToPath(import.meta.url));

/** Module specifiers a production file actually imports. */
function importedFrom(text: string): string[] {
  const specifiers: string[] = [];
  for (const match of text.matchAll(/from ["']([^"']+)["']/g)) {
    const specifier = match[1];
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

describe("server codec boundary", () => {
  it("imports codecs from the query entry and nothing client-side", () => {
    const files = readdirSync(SRC).filter(
      (name) => name.endsWith(".ts") && !name.endsWith(".test.ts")
    );
    expect(files).toEqual(["filters.ts", "index.ts"]);
    for (const name of files) {
      const specifiers = importedFrom(readFileSync(join(SRC, name), "utf8"));
      expect(specifiers, name).toContain("@adapttable/core/query");
      for (const specifier of specifiers) {
        const allowed =
          specifier.startsWith(".") || specifier === "@adapttable/core/query";
        expect(allowed, `${name} imports ${specifier}`).toBe(true);
      }
    }
  });
});
