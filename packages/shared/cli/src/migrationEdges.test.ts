import { describe, expect, it } from "vitest";

import {
  type ImportMoves,
  migrateVueScripts,
  wholeModuleDestination,
} from "./importMigration";
import { migrateV4File, migrateV4Source } from "./migrateV4";

const aligned: ImportMoves = {
  redirects: { "@adapttable/old": "@adapttable/next" },
  routes: {
    "@adapttable/old": {
      Kept: "@adapttable/next",
      Renamed: { to: "@adapttable/next", name: "Renamed" },
    },
  },
};

const split: ImportMoves = {
  redirects: { "@adapttable/split": "@adapttable/next" },
  routes: {
    "@adapttable/split": {
      One: "@adapttable/next",
      Two: "@adapttable/other",
    },
  },
};

describe("whole-module destinations", () => {
  it("rewrites a module only when every name shares the redirect", () => {
    expect(
      wholeModuleDestination("@adapttable/missing", aligned)
    ).toBeUndefined();
    expect(
      wholeModuleDestination("@adapttable/plain", aligned)
    ).toBeUndefined();
    expect(
      wholeModuleDestination("@adapttable/plain", {
        redirects: { "@adapttable/plain": "@adapttable/next" },
        routes: {},
      })
    ).toBe("@adapttable/next");
    expect(wholeModuleDestination("@adapttable/old", aligned)).toBe(
      "@adapttable/next"
    );
    expect(
      wholeModuleDestination("@adapttable/old", {
        redirects: aligned.redirects,
        routes: {
          ...aligned.routes,
          "@adapttable/next": { Further: "@adapttable/other" },
        },
      })
    ).toBeUndefined();
    expect(wholeModuleDestination("@adapttable/split", split)).toBeUndefined();
  });
});

describe("vue script migration", () => {
  it("rewrites a script and keeps the template line numbers", () => {
    const source = [
      "<template>",
      "  <p>stay</p>",
      "</template>",
      "<script>",
      "const value = 1;",
      "</script>",
      "<script setup>",
      "const again = 1;",
      "</script>",
      "",
    ].join("\n");
    const result = migrateVueScripts(source, (block) => ({
      code: block.replaceAll("1", "2"),
      changed: block.includes("1"),
      movedImports: block.includes("1") ? 1 : 0,
      issues: block.includes("again")
        ? [{ line: 1, column: 1, message: "look here" }]
        : [],
    }));
    expect(result.code).toContain("const value = 2;");
    expect(result.code).toContain("const again = 2;");
    expect(result.code).toContain("<p>stay</p>");
    expect(result.movedImports).toBe(2);
    expect(result.changed).toBe(true);
    expect(result.issues).toEqual([
      { line: 7, column: 1, message: "look here" },
    ]);
    expect(
      migrateVueScripts("<template><p>stay</p></template>\n", () => ({
        code: "",
        changed: true,
        movedImports: 1,
        issues: [],
      }))
    ).toEqual({
      code: "<template><p>stay</p></template>\n",
      changed: false,
      movedImports: 0,
      issues: [],
    });
  });
});

describe("text the migrator must not treat as code", () => {
  it("hides strings, comments and template text, and rewrites real imports", () => {
    const kept = [
      '/* import { selection } from "@adapttable/mui/features"; */',
      "const quoted = 'import { selection } from \"@adapttable/mui/features\";';",
      'const doubled = "import { selection } from \\"@adapttable/mui/features\\";";',
      'const sample = `import { useTableFeatures } from "@adapttable/mui/features";`;',
      'const price = `cost $5 import { useTableFeatures } from "@adapttable/mui/features";`;',
      'const escaped = `say \\` still ${1} import { useTableFeatures } from "@adapttable/mui/features";`;',
      'import { selection } from "@adapttable/mui/features";',
      "",
    ].join("\n");
    const result = migrateV4Source(kept);
    for (const line of result.code.split("\n").slice(0, 6)) {
      expect(line).not.toContain("@adapttable/react");
    }
    expect(result.code).toContain('from "@adapttable/react/features"');
    for (const open of [
      'const open = \'import { selection } from "@adapttable/mui/features";\nimport { selection } from "@adapttable/mui/features";\n',
      'const unfinished = `import { useTableFeatures } from "@adapttable/mui/features";\nimport { selection } from "@adapttable/mui/features";\n',
      '/* import { selection } from "@adapttable/mui/features";\nimport { selection } from "@adapttable/mui/features";\n',
    ]) {
      expect(migrateV4Source(open).code).toBe(open);
    }
  });

  it("rewrites an import that is code inside an interpolation", () => {
    const live = migrateV4Source(
      'const live = `before ${import { useTableFeatures } from "@adapttable/mui/features";} after`;\n'
    );
    expect(live.code).toContain('from "@adapttable/react/adapter"');
    const nested = migrateV4Source(
      'const live = `before ${foo({ bar: import { useTableFeatures } from "@adapttable/mui/features"; })} after`;\n'
    );
    expect(nested.code).toContain('from "@adapttable/react/adapter"');
    const hidden = migrateV4Source(
      "const live = `before ${'import { useTableFeatures } from \"@adapttable/mui/features\";'} after`;\n"
    );
    expect(hidden.code).toContain("@adapttable/mui/features");
    expect(hidden.code).not.toContain("@adapttable/react");
    const noted = migrateV4Source(
      [
        "const live = `before ${",
        '  // import { selectionStats } from "@adapttable/mui/features";',
        '  /* import { selectionStats } from "@adapttable/mui/features"; */',
        "  1",
        "}`;",
        'import { selection } from "@adapttable/mui/features";',
        "",
      ].join("\n")
    );
    expect(noted.code.split("\n")[1]).toContain("@adapttable/mui/features");
    expect(noted.code.split("\n")[2]).toContain("@adapttable/mui/features");
    expect(noted.code).toContain('from "@adapttable/react/features"');
    const unclosed = migrateV4Source(
      'const live = `before ${import { useTableFeatures } from "@adapttable/mui/features";`;\n'
    );
    expect(unclosed.code).toContain('from "@adapttable/react/adapter"');
  });

  it("moves a whole module through dynamic import and a renamed re-export", () => {
    expect(
      migrateV4Source(
        'const load = import("@adapttable/vue-unstyled/export-csv");\n'
      ).code
    ).toBe('const load = import("@adapttable/vue-unstyled/export");\n');
    expect(
      migrateV4Source(
        'export * as csv from "@adapttable/element-plus/export-csv";\n'
      ).code
    ).toBe('export * as csv from "@adapttable/element-plus/export";\n');
    const hidden = migrateV4Source(
      "const text = 'import * as csv from \"@adapttable/vue-unstyled/export-csv\"';\n"
    );
    expect(hidden.code).toContain("@adapttable/vue-unstyled/export-csv");
    expect(hidden.movedImports).toBe(0);
    const commented = migrateV4Source(
      '/* import * as csv from "@adapttable/vue-unstyled/export-csv" */\n'
    );
    expect(commented.code).toBe(
      '/* import * as csv from "@adapttable/vue-unstyled/export-csv" */\n'
    );
  });

  it("reports an import it cannot split, including a type-only one", () => {
    const complex = migrateV4Source(
      'import { selectionStats /* keep */, useTableFeatures } from "@adapttable/mui/features";\n'
    );
    expect(complex.changed).toBe(false);
    expect(complex.issues[0]?.message).toContain("Complex");
    const nested = migrateV4Source(
      'import { foo, require("@adapttable/vue-unstyled/export-csv") } from "@adapttable/mui/features";\n'
    );
    expect(nested.code).toContain("@adapttable/vue-unstyled/export-csv");
    expect(nested.code).not.toContain('@adapttable/vue-unstyled/export"');
    expect(nested.issues[0]?.message).toContain("Complex");
    const empty = migrateV4Source(
      'import {} from "@adapttable/mui/features";\n'
    );
    expect(empty.issues[0]?.message).toContain("Complex");
    expect(
      migrateV4Source(
        'import type { useTableFeatures } from "@adapttable/mui/features";\n'
      ).code
    ).toBe(
      'import type { useTableFeatures } from "@adapttable/react/adapter";\n'
    );
    expect(
      migrateV4Source(
        "import { useTableFeatures } from '@adapttable/mui/features';\n"
      ).code
    ).toBe("import { useTableFeatures } from '@adapttable/react/adapter';\n");
    expect(
      migrateV4Source(
        'export type { useTableFeatures } from "@adapttable/mui/features";\n'
      ).code
    ).toBe(
      'export type { useTableFeatures } from "@adapttable/react/adapter";\n'
    );
  });

  it("reports a script diagnostic once, on the script's line", () => {
    const source = [
      "<template>",
      "  <p>stay</p>",
      "</template>",
      "<script>",
      "const rows = sortRows(sortRows(data));",
      "const store = createEditConflictStore();",
      "</script>",
      '<DataTable title="a>b" [selectedIds]="ids"></DataTable>',
      '<AdaptDataTable [selectedIds]="ids"></AdaptDataTable>',
      '<adapt-table title="a\\"b" [selectedIds]="ids"></adapt-table>',
      "</DataTable>",
      '<div [selectedIds]="ids"></div>',
      "",
    ].join("\n");
    const result = migrateV4File(source, "people.vue");
    const sortRows = result.issues.filter((issue) =>
      issue.message.includes("sortRows")
    );
    expect(sortRows).toHaveLength(1);
    expect(sortRows[0]?.line).toBe(5);
    expect(
      result.issues.some((issue) =>
        issue.message.includes("createEditConflictStore")
      )
    ).toBe(true);
    expect(
      result.issues.filter((issue) => issue.message.includes("[selectedIds]"))
    ).toHaveLength(3);
    expect(migrateV4File(source, "notes.html").changed).toBe(false);
    expect(() =>
      migrateV4File('<DataTable [selectedIds]="ids"', "open.html")
    ).not.toThrow();
    expect(
      migrateV4File('<DataTable [selectedIds]="ids"', "open.html").issues
    ).toHaveLength(1);
  });
});
