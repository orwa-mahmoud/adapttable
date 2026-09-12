/**
 * `@adapttable/ai` stays React-free. The published root graph must not
 * import `react` or `@adapttable/react` — that binding lives on
 * `@adapttable/ai-react`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const ENTRIES = [
  "index",
  "json",
  "openai",
  "mcp",
  "http",
  "assistant",
  "context",
];

const REACT_IMPORT =
  /(?:from|import)[\s(]*["'](?:react|react-dom|react\/[^"']+|@adapttable\/react(?:\/[^"']+)?)["']/;

function runtimeFiles(): string[] {
  if (!existsSync(DIST)) return [];
  return readdirSync(DIST)
    .filter((name) => ENTRIES.some((entry) => name === `${entry}.js`))
    .map((name) => join(DIST, name));
}

describe("AI root stays React-free", () => {
  it("public source entries import neither react nor @adapttable/react", () => {
    for (const entry of ENTRIES) {
      const source = readFileSync(join(ROOT, "src", `${entry}.ts`), "utf8");
      expect(source, entry).not.toMatch(REACT_IMPORT);
    }
  });

  it("published root dist does not mention react or @adapttable/react", () => {
    const files = runtimeFiles();
    expect(files.length, "build @adapttable/ai before this assertion").toBe(
      ENTRIES.length
    );
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(REACT_IMPORT);
      expect(text, file).not.toMatch(/["']@adapttable\/react["']/);
      expect(text, file).not.toMatch(/["']react["']/);
    }
  });
});
