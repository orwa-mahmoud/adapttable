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
      'import { type HeaderGroupCell, headerGroupRows as rows } from "@adapttable/react/adapter";'
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
      "import type { BodyCell as Cell, RowReorderState } from '@adapttable/react/adapter';\n"
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

  it("reports enabling props that follow an arrow rowKey", () => {
    const input = `export const table = (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    enableColumnMenu
    exportCsv
    groupBy="city"
  />
);
`;
    const result = migrateV3Source(input);
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("DataTable.enableColumnMenu"),
        expect.stringContaining("DataTable.exportCsv"),
        expect.stringContaining("DataTable.groupBy"),
      ])
    );
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

  it("scans past an escaped quote inside a DataTable attribute", () => {
    const input = `<DataTable title="say \\"hi\\"" enableColumnMenu />\n`;
    const result = migrateV3Source(input);
    expect(result.changed).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("DataTable.enableColumnMenu"),
      ])
    );
  });

  it("skips a DataTable whose opening quote never closes", () => {
    const input = `<DataTable title="unclosed enableColumnMenu\n`;
    const result = migrateV3Source(input);
    expect(result.code).toBe(input);
    expect(result.changed).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it("skips a DataTable whose opening tag never ends", () => {
    const input = `<DataTable enableColumnMenu\n`;
    const result = migrateV3Source(input);
    expect(result.code).toBe(input);
    expect(result.changed).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it("moves an app-tier import to the React binding", () => {
    const result = migrateV3Source(
      `import { useDataTable, DEFAULT_LIMIT } from "@adapttable/core";\n`
    );
    expect(result.code).toBe(
      `import { DEFAULT_LIMIT } from "@adapttable/core";\n` +
        `import { useDataTable } from "@adapttable/react";\n`
    );
    expect(result.movedImports).toBe(1);
  });

  it("splits one import across every package it now spans", () => {
    const result = migrateV3Source(
      `import { useDataTable, HeaderGroupCell, DEFAULT_LIMIT } from "@adapttable/core";\n`
    );
    expect(result.code).toBe(
      `import { DEFAULT_LIMIT } from "@adapttable/core";\n` +
        `import { useDataTable } from "@adapttable/react";\n` +
        `import { HeaderGroupCell } from "@adapttable/react/adapter";\n`
    );
    expect(result.movedImports).toBe(2);
  });

  it("redirects a core subpath that moved wholesale", () => {
    const result = migrateV3Source(
      `import { editing } from "@adapttable/core/features";\n`
    );
    expect(result.code).toBe(
      `import { editing } from "@adapttable/react/features";\n`
    );
    expect(result.movedImports).toBe(1);
  });

  it("moves the React half of a subpath and leaves the neutral half", () => {
    // `parseFormula` is neutral and stays; the hook is React's.
    const result = migrateV3Source(
      `import { useFormulaUrlState, parseFormula } from "@adapttable/core/formula";\n`
    );
    expect(result.code).toBe(
      `import { parseFormula } from "@adapttable/core/formula";\n` +
        `import { useFormulaUrlState } from "@adapttable/react/formula";\n`
    );
  });

  it("keeps type-only and aliased specifiers intact", () => {
    const result = migrateV3Source(
      `import type { ColumnDef as Col, SortDirection } from "@adapttable/core";\n`
    );
    expect(result.code).toBe(
      `import type { SortDirection } from "@adapttable/core";\n` +
        `import type { ColumnDef as Col } from "@adapttable/react";\n`
    );
  });

  it("rewrites a re-export the same way as an import", () => {
    const result = migrateV3Source(
      `export { useFrontendData } from "@adapttable/core";\n`
    );
    expect(result.code).toBe(
      `export { useFrontendData } from "@adapttable/react";\n`
    );
  });

  it("is a no-op when run twice", () => {
    const input =
      `import { useDataTable, HeaderGroupCell, DEFAULT_LIMIT } from "@adapttable/core";\n` +
      `import { editing } from "@adapttable/core/features";\n`;
    const once = migrateV3Source(input);
    const twice = migrateV3Source(once.code);
    expect(twice.code).toBe(once.code);
    expect(twice.changed).toBe(false);
    expect(twice.movedImports).toBe(0);
  });

  it("leaves an already-migrated source alone", () => {
    const input =
      `import { useDataTable } from "@adapttable/react";\n` +
      `import { editing } from "@adapttable/react/features";\n`;
    const result = migrateV3Source(input);
    expect(result.code).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("leaves a kit import untouched", () => {
    const input = `import { DataTable } from "@adapttable/mantine";\n`;
    expect(migrateV3Source(input).code).toBe(input);
  });

  it("moves an AI consumer's React binding import", () => {
    const result = migrateV3Source(
      `import { useDataTable } from "@adapttable/core";\n` +
        `import { tableAgent } from "@adapttable/ai/react";\n`
    );
    expect(result.code).toContain(
      `import { useDataTable } from "@adapttable/react";`
    );
    expect(result.code).toContain(
      `import { tableAgent } from "@adapttable/ai-react";`
    );
  });

  it("reports a namespace import instead of guessing", () => {
    const input = `import * as core from "@adapttable/core";\n`;
    const result = migrateV3Source(input);
    expect(result.code).toBe(input);
    expect(result.changed).toBe(false);
  });
});
