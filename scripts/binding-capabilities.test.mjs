import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import ts from "typescript";

import {
  BINDING_CAPABILITIES,
  callableNames,
  checkCapabilitySurface,
  factoryProblems,
} from "./binding-capabilities.mjs";

const SURFACE = `export interface DataTableProps {
  locale?: string;
  stickyHeader?: boolean;
  mobileBreakpoint?: number;
  searchDebounceMs?: number;
  onRowClick?: (row: { id: string }) => void;
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  searchPlaceholder?: string;
  onQueryChange?: (
    query: { page?: number; limit?: number },
    info: { signal: AbortSignal }
  ) => void;
}
`;

/**
 * @param {Record<string, string>} files
 * @param {string} entry
 */
function programOf(files, entry) {
  const dir = mkdtempSync(join(tmpdir(), "adapttable-capabilities-"));
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, name), text);
  }
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
      },
      files: Object.keys(files),
    })
  );
  const read = ts.readConfigFile(join(dir, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    dirname(join(dir, "tsconfig.json"))
  );
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });
  return {
    dir,
    program,
    checker: program.getTypeChecker(),
    source: program.getSourceFile(join(dir, entry)),
  };
}

describe("binding capability checker", () => {
  it("fails when a normalized prop is removed", () => {
    const loaded = programOf(
      {
        "props.ts": SURFACE.replace("  stickyHeader?: boolean;\n", ""),
      },
      "props.ts"
    );
    try {
      const checked = checkCapabilitySurface({
        checker: loaded.checker,
        source: loaded.source,
        typeName: "DataTableProps",
        framework: "react",
      });
      assert.ok(
        checked.problems.some((problem) =>
          problem.includes("missing sticky-header")
        ),
        checked.problems.join("\n")
      );
    } finally {
      rmSync(loaded.dir, { recursive: true, force: true });
    }
  });

  it("fails when a callback's parameter type breaks", () => {
    const loaded = programOf(
      {
        "props.ts": SURFACE.replace(
          "isCellFlashing?: (rowId: string, columnKey: string) => boolean;",
          "isCellFlashing?: (value: number) => void;"
        ),
      },
      "props.ts"
    );
    try {
      const checked = checkCapabilitySurface({
        checker: loaded.checker,
        source: loaded.source,
        typeName: "DataTableProps",
        framework: "angular",
      });
      assert.ok(
        checked.problems.some((problem) =>
          problem.includes("cell-flash (isCellFlashing) is not a callback")
        ),
        checked.problems.join("\n")
      );
    } finally {
      rmSync(loaded.dir, { recursive: true, force: true });
    }
  });

  it("accepts an InputSignal spelling and an aliased factory name", () => {
    const loaded = programOf(
      {
        "props.ts": `type InputSignal<T> = T;
export class Shell {
  locale: InputSignal<string | undefined> = undefined;
  stickyHeader: InputSignal<boolean> = false;
  mobileBreakpoint: InputSignal<number> = 0;
  searchDebounceMs: InputSignal<number> = 0;
  onRowClick: InputSignal<((row: { id: string }) => void) | undefined> = undefined;
  isCellFlashing: InputSignal<
    ((rowId: string, columnKey: string) => boolean) | undefined
  > = undefined;
  searchPlaceholder: InputSignal<string | undefined> = undefined;
  onQueryChange: InputSignal<
    | ((
        query: { page?: number },
        info: { signal: AbortSignal }
      ) => void)
    | undefined
  > = undefined;
}
`,
        "features.ts": `function rowReorder() {
  return 1;
}
export { rowReorder as filters };
export function locale() {
  return "en";
}
`,
      },
      "props.ts"
    );
    try {
      const checked = checkCapabilitySurface({
        checker: loaded.checker,
        source: loaded.source,
        typeName: "Shell",
        framework: "angular",
      });
      assert.deepEqual(checked.problems, []);
      assert.equal(checked.found.length, BINDING_CAPABILITIES.length);
      const features = loaded.program.getSourceFile(
        join(loaded.dir, "features.ts")
      );
      const names = callableNames(loaded.checker, [features]);
      assert.deepEqual(
        factoryProblems(names, ["filters", "locale"], "angular"),
        []
      );
      assert.deepEqual(factoryProblems(names, ["densityChooser"], "angular"), [
        "angular: feature factory densityChooser is missing",
      ]);
    } finally {
      rmSync(loaded.dir, { recursive: true, force: true });
    }
  });

  it("fails a difference whose capability is already present", () => {
    const loaded = programOf({ "props.ts": SURFACE }, "props.ts");
    try {
      const checked = checkCapabilitySurface({
        checker: loaded.checker,
        source: loaded.source,
        typeName: "DataTableProps",
        framework: "vue",
        differences: [
          {
            capability: "sticky-header",
            framework: "vue",
            reason: "added later",
            disposition: "owner-approved",
          },
        ],
      });
      assert.ok(
        checked.problems.some((problem) =>
          problem.includes("stale difference for sticky-header")
        ),
        checked.problems.join("\n")
      );
    } finally {
      rmSync(loaded.dir, { recursive: true, force: true });
    }
  });
});
