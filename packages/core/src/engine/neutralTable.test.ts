import { describe, expect, it } from "vitest";

import { createTableEngine } from "./createTableEngine";
import { createNeutralTable, revisionToken } from "./neutralTable";

interface Row {
  id: string;
  label: string;
}

describe("createNeutralTable binding", () => {
  it("uses binding visible rows for the visible scope", () => {
    const rows: Row[] = [
      { id: "1", label: "one" },
      { id: "2", label: "two" },
      { id: "3", label: "three" },
    ];
    const engine = createTableEngine({
      data: rows,
      columns: [{ key: "label", header: "Label" }],
      rowKey: (row) => row.id,
      defaults: { page: 1, limit: 2 },
    });
    const table = createNeutralTable(engine, "t", {
      visibleRows: () => [rows[2]!, rows[0]!],
    });
    expect(table.rows("page").map((row) => row.id)).toEqual(["1", "2"]);
    expect(table.rows("visible").map((row) => row.id)).toEqual(["3", "1"]);
    expect(table.rowKey(rows[0]!)).toBe("1");
  });

  it("returns the filtered full set for in-memory engines", () => {
    const engine = createTableEngine({
      data: [{ id: "1", label: "one" }],
      columns: [{ key: "label", header: "Label" }],
      rowKey: (row) => row.id,
    });
    const table = createNeutralTable(engine, "t");
    expect(table.rows("full")).toHaveLength(1);
    expect(table.capabilities.fullDataset).toBe(true);
  });

  it("rejects full scope when capabilities disallow it", () => {
    const engine = createTableEngine({
      data: [{ id: "1", label: "one" }],
      columns: [{ key: "label", header: "Label" }],
      rowKey: (row) => row.id,
    });
    const table = createNeutralTable(engine, "t");
    const pageOnly = {
      ...table,
      get capabilities() {
        return {
          fullDataset: false,
          grouping: false as const,
          selectAcrossPages: false,
          exportScope: "page" as const,
          totalCount: "loaded" as const,
        };
      },
      rows(scope: "visible" | "page" | "full") {
        if (scope === "full") {
          throw new Error(
            'row scope "full" is not available — this source provides one page at a time'
          );
        }
        return table.rows(scope);
      },
    };
    expect(() => pageOnly.rows("full")).toThrow(/not available/);
  });

  it("maps revision axes to a token", () => {
    const engine = createTableEngine({
      data: [{ id: "1", label: "one" }],
      columns: [{ key: "label", header: "Label" }],
      rowKey: (row) => row.id,
    });
    const table = createNeutralTable(engine, "t");
    expect(revisionToken(table.revisions)).toMatch(/^\d+:\d+:\d+:\d+$/);
  });
});
