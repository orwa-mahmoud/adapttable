import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli, runCliEntry } from "./cli";

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

describe("adapttable commands", () => {
  const source = 'import { useDataTable } from "@adapttable/core";\n';

  function silence(): void {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  }

  it("prints usage and rejects a command it does not know", () => {
    const logs: string[] = [];
    const errors: string[] = [];
    vi.spyOn(console, "log").mockImplementation((message: string) => {
      logs.push(String(message));
    });
    vi.spyOn(console, "error").mockImplementation((message: string) => {
      errors.push(String(message));
    });
    expect(runCli([])).toBe(0);
    expect(runCli(["--help"])).toBe(0);
    expect(runCli(["-h"])).toBe(0);
    expect(runCli(["help"])).toBe(0);
    expect(logs.every((line) => line.includes("Usage:"))).toBe(true);
    expect(runCli(["migrate"])).toBe(1);
    expect(errors.some((line) => line.includes("Unknown command"))).toBe(true);
    vi.restoreAllMocks();
  });

  it("walks a project, skips dependencies and links, and migrates v3", () => {
    const root = project();
    mkdirSync(join(root, "src"));
    mkdirSync(join(root, "node_modules"));
    write(root, "src/table.ts", source);
    write(root, "notes.md", source);
    write(root, "node_modules/hidden.js", source);
    symlinkSync(join(root, "src", "table.ts"), join(root, "link.ts"));
    write(
      root,
      "page.vue",
      [
        "<template>",
        "  <p>stay</p>",
        "</template>",
        "<script>",
        'import { useDataTable } from "@adapttable/core";',
        'import * as core from "@adapttable/core";',
        "</script>",
        "",
      ].join("\n")
    );
    write(root, "table.component.html", "<p>stay</p>\n");
    silence();
    expect(runCli(["migrate-v3"], root)).toBe(1);
    expect(readFileSync(join(root, "src/table.ts"), "utf8")).toContain(
      "@adapttable/react"
    );
    expect(readFileSync(join(root, "notes.md"), "utf8")).toBe(source);
    expect(readFileSync(join(root, "node_modules/hidden.js"), "utf8")).toBe(
      source
    );
    expect(readFileSync(join(root, "page.vue"), "utf8")).toContain(
      "@adapttable/react"
    );
    expect(readFileSync(join(root, "page.vue"), "utf8")).toContain(
      'import * as core from "@adapttable/core";'
    );
    expect(readFileSync(join(root, "table.component.html"), "utf8")).toBe(
      "<p>stay</p>\n"
    );
    expect(runCli(["migrate-v4", "/dev/null"], root)).toBe(0);
    expect(runCli(["migrate-v4", "notes.md"], root)).toBe(0);
    expect(readFileSync(join(root, "notes.md"), "utf8")).toBe(source);
    expect(runCli(["migrate-v4", "."], join(root, "src/table.ts"))).toBe(0);
    expect(runCli(["migrate-v4", "missing.ts"], root)).toBe(1);
    expect(runCli(["migrate-v4", "--dry-run"], root)).toBe(1);
    expect(runCli(["init"], project())).toBe(1);
    vi.restoreAllMocks();
  });

  it("scaffolds from the init command and reports a bad option", () => {
    const root = project();
    write(root, "package.json", '{"dependencies":{"react":"18"}}\n');
    silence();
    expect(runCli(["init"], root)).toBe(0);
    expect(readFileSync(join(root, "src/PeopleTable.tsx"), "utf8")).toContain(
      "PeopleTable"
    );
    expect(runCli(["init", "--force", "--kit", "mantine"], root)).toBe(0);
    expect(runCli(["init", "--kit"], root)).toBe(1);
    expect(runCli(["init", "--kit", "not-a-kit"], root)).toBe(1);
    expect(runCli(["init", "--sideways"], root)).toBe(1);
    expect(runCli(["init", "--kit", "angular-material"], root)).toBe(1);
    vi.restoreAllMocks();
  });

  it("reports a filesystem failure that is not an init error", () => {
    const root = project();
    write(root, "package.json", '{"dependencies":{"react":"18"}}\n');
    chmodSync(root, 0o111);
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((message: string) => {
      errors.push(String(message));
    });
    try {
      expect(runCli(["init"], root)).toBe(1);
      expect(errors.some((line) => line.includes("EACCES"))).toBe(true);
    } finally {
      chmodSync(root, 0o755);
      vi.restoreAllMocks();
    }
  });

  it("runs when the program is a symlink to this file, as a package bin is", () => {
    const root = project();
    const target = join(root, "cli.mjs");
    write(root, "cli.mjs", "");
    const bin = join(root, "adapttable");
    symlinkSync(target, bin);
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(() =>
      runCliEntry(pathToFileURL(realpathSync(target)).href, bin, ["--help"])
    ).toThrow("exit");
    expect(exit).toHaveBeenCalledWith(0);
    vi.restoreAllMocks();
  });

  it("does not run when the program path does not exist", () => {
    const entry = join(project(), "missing.mjs");
    const exit = vi.spyOn(process, "exit");
    runCliEntry(pathToFileURL(entry).href, entry, ["--help"]);
    expect(exit).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("exits when this file is the program", () => {
    const root = project();
    write(root, "cli.mjs", "");
    const entry = realpathSync(join(root, "cli.mjs"));
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(() =>
      runCliEntry("file:///other.mjs", entry, ["--help"])
    ).not.toThrow();
    expect(() =>
      runCliEntry(pathToFileURL(entry).href, entry, ["--help"])
    ).toThrow("exit");
    expect(exit).toHaveBeenCalledWith(0);
    vi.restoreAllMocks();
  });
});
