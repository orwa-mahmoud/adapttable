import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(root, entry.name);
    if (entry.name === "node_modules" || entry.name.startsWith(".")) return [];
    return entry.isDirectory() ? files(filename) : [filename];
  });
}

const sources = files(directory).filter(
  (filename) => /\.(?:ts|html)$/.test(filename) && !filename.includes(".test.")
);

describe("Spartan package boundary", () => {
  it("fills native control elements with the owned Helm directives", () => {
    for (const filename of sources) {
      const source = readFileSync(filename, "utf8");
      const tags =
        source.match(
          /<(?:button|input|select|textarea|a)\b(?:[^">]|"[^"]*")*>/g
        ) ?? [];
      for (const tag of tags) {
        expect(tag, filename).toMatch(/adaptHlm(?:Button|Input|NativeSelect)/);
      }
      expect(source, filename).not.toMatch(/<(?:details|summary|dialog)\b/);
    }
  });

  it("does not import another kit or the neutral engine directly", () => {
    for (const filename of sources) {
      const source = readFileSync(filename, "utf8");
      expect(source, filename).not.toMatch(
        /from ["']@adapttable\/(?:core|react|angular-unstyled|ng-zorro)[/"']/
      );
    }
  });

  it("owns styles without global resets or unprefixed global tokens", () => {
    const css = readFileSync(path.join(directory, "styles.css"), "utf8");
    expect(css).toContain('@reference "tailwindcss"');
    expect(css).not.toMatch(/@import\s+["']tailwindcss|:root/);
    const trimmedLines = css
      .split("\n")
      .map((line) => line.trimStart())
      .join("\n");
    expect(trimmedLines).not.toMatch(/^(?:html|body)\s*\{/m);
    expect(css).not.toMatch(
      /--(?:background|foreground|primary|border|ring)\s*:/
    );
    expect(css).toContain('[data-adapttable-kit="spartan"]');
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("inset-inline-end");
  });
});
