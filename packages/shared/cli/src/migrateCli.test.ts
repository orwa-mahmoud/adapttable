import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "./cli";

const roots: string[] = [];

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "adapttable-migrate-"));
  roots.push(root);
  return root;
}

function write(root: string, path: string, source: string): void {
  writeFileSync(join(root, path), source);
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("adapttable migrate-v4", () => {
  const source =
    'import { selectionStats, useTableFeatures } from "@adapttable/mui/features";\n';
  const migrated =
    'import { selectionStats } from "@adapttable/react/features";\nimport { useTableFeatures } from "@adapttable/react/adapter";\n';

  it("rewrites one file, then a second pass changes nothing", () => {
    const root = project();
    write(root, "table.js", source);
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message: string) => {
      logs.push(message);
    });
    expect(runCli(["migrate-v4", "table.js"], root)).toBe(0);
    expect(readFileSync(join(root, "table.js"), "utf8")).toBe(migrated);
    expect(runCli(["migrate-v4", "table.js"], root)).toBe(0);
    expect(readFileSync(join(root, "table.js"), "utf8")).toBe(migrated);
    expect(logs.some((line) => line.includes("moved 0 import"))).toBe(true);
    vi.restoreAllMocks();
  });

  it("checks a directory without writing and points at the original template line", () => {
    const root = project();
    write(
      root,
      "src-note.js",
      "const example = 'import { selectionStats, useTableFeatures } from \"@adapttable/mui/features\";';\n"
    );
    write(root, "table.ts", source);
    write(
      root,
      "table.component.html",
      '<adapt-data-table [selectedIds]="ids"></adapt-data-table>\n<app-people [selectedIds]="ids"></app-people>\n'
    );
    write(
      root,
      "people.vue",
      [
        "<script>",
        'import { selectionStats, useTableFeatures } from "@adapttable/mui/features";',
        "</script>",
        "<template>",
        '<adapt-data-table [selectedIds]="ids" />',
        "</template>",
        "",
      ].join("\n")
    );
    const errors: string[] = [];
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation((message: string) => {
      errors.push(String(message));
    });
    expect(runCli(["migrate-v4", ".", "--check"], root)).toBe(1);
    expect(readFileSync(join(root, "table.ts"), "utf8")).toBe(source);
    expect(readFileSync(join(root, "src-note.js"), "utf8")).toContain(
      "@adapttable/mui/features"
    );
    expect(
      errors.some((line) => line.startsWith("table.component.html:1:"))
    ).toBe(true);
    expect(errors.some((line) => line.startsWith("people.vue:5:"))).toBe(true);
    expect(errors.some((line) => line.includes("app-people"))).toBe(false);
    vi.restoreAllMocks();
  });
});
