/**
 * Source files stay text.
 *
 * A composite key needs a separator no label can contain, so several modules
 * here build keys out of control characters. Written as escapes (`\u0000`) they
 * are visible in the file; written as the characters themselves they are
 * invisible in it, and git stops treating the file as text at all — no diff, no
 * blame, nothing for a reviewer to read. Nothing else notices: the file
 * compiles and its tests pass, so the byte is what gets checked, once, for the
 * whole package.
 *
 * @vitest-environment node
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/** This package's `src`, wherever the runner was started from. */
const SRC = fileURLToPath(new URL(".", import.meta.url));

/** Tab, newline and carriage return, and nothing else below a space. */
const ALLOWED_CONTROL_BYTES = new Set([9, 10, 13]);

/** Every TypeScript file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(path));
    else if (path.endsWith(".ts") || path.endsWith(".tsx")) found.push(path);
  }
  return found;
}

/** Whether a file holds a control character as a literal byte. */
function inlinesControlByte(path: string): boolean {
  for (const byte of readFileSync(path)) {
    if (byte < 32 && !ALLOWED_CONTROL_BYTES.has(byte)) return true;
  }
  return false;
}

describe("source bytes", () => {
  it("no file inlines a raw control character", () => {
    const files = sourceFiles(SRC);

    // A walk that found nothing would pass this test forever.
    expect(files.length).toBeGreaterThan(100);
    expect(
      files.filter(inlinesControlByte).map((p) => relative(SRC, p))
    ).toEqual([]);
  });
});
