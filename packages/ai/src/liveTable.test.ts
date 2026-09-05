import {
  createTableEngine,
  createNeutralTable,
  revisionToken,
} from "@adapttable/core";
import { describe, expect, it } from "vitest";

import {
  agentColumnsFromNeutral,
  readRowsFromNeutral,
  resolveRowFromNeutral,
  rowAddressScopeForNeutral,
  transportCellValue,
} from "./liveTable";

type Row = { id: string; name: string; team: string };

const COLUMNS = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team" },
];

function table(rows: Row[], visible?: Row[]) {
  const engine = createTableEngine({
    data: rows,
    columns: COLUMNS,
    rowKey: (row) => row.id,
  });
  return createNeutralTable(engine, "demo", {
    visibleRows: () => visible ?? rows,
    operations: () => ({ setPage: true, setSearch: true, setSort: true }),
  });
}

describe("liveTable bridge", () => {
  it("discovers columns and resolves nested cell values", () => {
    const neutral = table([
      { id: "1", name: "Ada", team: "ops" },
      { id: "2", name: "Grace", team: "eng" },
    ]);
    const columns = agentColumnsFromNeutral(neutral);
    expect(columns.map((column) => column.id)).toEqual(["name", "team"]);
    const window = readRowsFromNeutral(
      neutral,
      columns,
      {
        offset: 0,
        limit: 10,
        scope: "page",
      },
      50
    );
    expect(window.rows[0]?.cells.name).toBe("Ada");
  });

  it("keeps visible and page scopes distinct when binding supplies visible rows", () => {
    const rows = [
      { id: "1", name: "Ada", team: "ops" },
      { id: "2", name: "Grace", team: "eng" },
      { id: "3", name: "Lin", team: "ops" },
    ];
    const neutral = createTableEngine({
      data: rows,
      columns: COLUMNS,
      rowKey: (row) => row.id,
      defaults: { page: 1, limit: 2 },
    });
    const bound = createNeutralTable(neutral, "paged", {
      visibleRows: () => [rows[1]!, rows[0]!],
    });
    expect(bound.rows("page").map((row) => row.id)).toEqual(["1", "2"]);
    expect(bound.rows("visible").map((row) => row.id)).toEqual(["2", "1"]);
    expect(rowAddressScopeForNeutral(bound)).toBe("visible");
    const resolved = resolveRowFromNeutral(bound, {
      position: 1,
      scope: "visible",
      expectedRevision: 0,
    });
    expect(resolved.rowKey).toBe("2");
  });

  it("maps revision axes to a stable token and transports non-JSON values", () => {
    const neutral = table([{ id: "1", name: "Ada", team: "ops" }]);
    const before = revisionToken(neutral.revisions);
    expect(typeof before).toBe("string");
    expect(transportCellValue(42n)).toBe("42");
    expect(transportCellValue(() => undefined)).toEqual({
      __adapttable: "function",
      name: "anonymous",
    });
  });

  it("rejects full reads when the source is page-only", () => {
    const rows = [
      { id: "1", name: "Ada", team: "ops" },
      { id: "2", name: "Grace", team: "eng" },
    ];
    const engine = createTableEngine({
      data: rows,
      columns: COLUMNS,
      rowKey: (row) => row.id,
      defaults: { page: 1, limit: 1 },
    });
    const pageOnly = createNeutralTable(engine, "paged", {
      visibleRows: () => rows.slice(0, 1),
      operations: () => ({}),
    });
    const columns = agentColumnsFromNeutral(pageOnly);
    Object.defineProperty(pageOnly, "capabilities", {
      get: () => ({
        fullDataset: false,
        grouping: false,
        selectAcrossPages: false,
        exportScope: "page" as const,
        totalCount: "loaded" as const,
      }),
    });
    expect(() =>
      readRowsFromNeutral(
        pageOnly,
        columns,
        { offset: 0, limit: 10, scope: "full" },
        50
      )
    ).toThrow(/not available/);
  });

  it("honours column permission patches and readMax bounds", () => {
    const neutral = table([{ id: "1", name: "Ada", team: "secret" }]);
    const columns = agentColumnsFromNeutral(neutral, {
      team: { readable: false, label: "Team (hidden)" },
    });
    const window = readRowsFromNeutral(
      neutral,
      columns,
      { offset: 0, limit: 100, scope: "visible" },
      1
    );
    expect(window.limit).toBe(1);
    expect(window.redacted).toContain("team");
    expect(window.rows[0]?.cells.team).toBeUndefined();
    expect(window.rows[0]?.cells.name).toBe("Ada");
  });

  it("resolves computed and nested values through the engine cell path", () => {
    const engine = createTableEngine({
      data: [{ id: "1", profile: { city: "Paris" }, name: "Ada" }],
      columns: [
        {
          key: "city",
          header: "City",
          formatValue: (row) => row.profile.city,
        },
      ],
      rowKey: (row) => row.id,
    });
    const neutral = createNeutralTable(engine, "nested", {
      visibleRows: () => engine.rows("page"),
    });
    const columns = agentColumnsFromNeutral(neutral);
    const window = readRowsFromNeutral(
      neutral,
      columns,
      { offset: 0, limit: 1, scope: "visible" },
      50
    );
    expect(window.rows[0]?.cells.city).toBe("Paris");
  });
});
