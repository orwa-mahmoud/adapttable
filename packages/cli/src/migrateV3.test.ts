import { describe, expect, it } from "vitest";

import { migrateV3Source } from "./migrateV3";

describe("migrateV3Source", () => {
  it("splits moved adapter imports from main-entry imports", () => {
    const input = `import {
  type HeaderGroupCell,
  DataTable,
  headerGroupRows as rows,
} from "@adapttable/core";

export { DataTable, rows };
`;

    const first = migrateV3Source(input);
    expect(first.changed).toBe(true);
    expect(first.movedImports).toBe(2);
    expect(first.issues).toEqual([]);
    expect(first.code).toContain(
      'import { DataTable } from "@adapttable/core";'
    );
    expect(first.code).toContain(
      'import { type HeaderGroupCell, headerGroupRows as rows } from "@adapttable/core/adapter";'
    );

    const second = migrateV3Source(first.code);
    expect(second).toEqual({
      code: first.code,
      changed: false,
      movedImports: 0,
      issues: [],
    });
  });

  it("preserves type-only imports and quote style", () => {
    const result = migrateV3Source(
      "import type { BodyCell as Cell, RowReorderState } from '@adapttable/core'\n"
    );
    expect(result.code).toBe(
      "import type { BodyCell as Cell, RowReorderState } from '@adapttable/core/adapter';\n"
    );
    expect(result.movedImports).toBe(2);
  });

  it("leaves unrelated imports unchanged", () => {
    const input =
      'import { DataTable } from "@adapttable/core";\nconst value = 1;\n';
    expect(migrateV3Source(input)).toEqual({
      code: input,
      changed: false,
      movedImports: 0,
      issues: [],
    });
  });

  it("reports complex imports instead of dropping comments", () => {
    const input =
      'import { headerGroupRows /* keep this */ } from "@adapttable/core";\n';
    const result = migrateV3Source(input);
    expect(result.code).toBe(input);
    expect(result.changed).toBe(false);
    expect(result.issues).toEqual([
      {
        line: 1,
        column: 1,
        message: expect.stringContaining("Complex"),
      },
    ]);
  });

  it("reports behavior-dependent migrations without changing them", () => {
    const input = `import { useChromeBodyData } from "@adapttable/core";

const registry = FilterTypeRegistry.register(spec);
const table = (
  <DataTable
    virtualize
    groupBy="team"
    size="small"
  />
);
`;
    const result = migrateV3Source(input);
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("DataTable.virtualize"),
        expect.stringContaining("DataTable.groupBy"),
        expect.stringContaining("FilterTypeRegistry"),
        expect.stringContaining("useChromeBodyData"),
        expect.stringContaining("DataTable.size"),
      ])
    );
    expect(result.issues.every((issue) => issue.line > 0)).toBe(true);
    expect(result.issues.every((issue) => issue.column > 0)).toBe(true);
  });

  it("accepts an empty named import conservatively", () => {
    const input = 'import { } from "@adapttable/core";';
    const result = migrateV3Source(input);
    expect(result.code).toBe(input);
    expect(result.issues).toHaveLength(1);
  });
});
