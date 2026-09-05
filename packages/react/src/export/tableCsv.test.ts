import type { TableSource } from "@adapttable/core";
import { resetDevWarnings } from "@adapttable/core";
import {
  buildTableCsv,
  exportableColumns,
  makeExportCsvHandler,
  resolveExportCsv,
} from "@adapttable/core";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";

beforeEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

interface Person {
  id: string;
  name: string;
  age: number;
}

const COLS: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "age", header: "Age", accessor: (r) => r.age },
  { key: "actions", header: "Actions" },
  { key: "reorder", header: "Reorder" },
];

const PAGE: Person[] = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 85 },
];

const ALL: Person[] = [...PAGE, { id: "3", name: "Alan", age: 41 }];

function source(
  rows: readonly Person[],
  allFilteredRows?: readonly Person[]
): TableSource<Person> {
  return {
    rows,
    allFilteredRows,
    total: allFilteredRows?.length ?? rows.length,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => undefined,
    error: null,
    paginationMode: "paged",
    page: 1,
    limit: 2,
    defaultLimit: 2,
    search: "",
    sortBy: undefined,
    sortDir: undefined,
    groupBy: undefined,
    extra: {},
    setPage: () => undefined,
    setLimit: () => undefined,
    setSort: () => undefined,
    setGroupBy: () => undefined,
    sortLevels: [],
    toggleSortLevel: () => undefined,
    setSearch: () => undefined,
    setExtra: () => undefined,
    setExtras: () => undefined,
    clearExtras: () => undefined,
    clearAll: () => undefined,
  };
}

describe("resolveExportCsv", () => {
  it("turns off for falsy", () => {
    expect(resolveExportCsv(undefined)).toBeNull();
    expect(resolveExportCsv(false)).toBeNull();
  });

  it("accepts true and option objects", () => {
    expect(resolveExportCsv(true)).toEqual({});
    expect(resolveExportCsv({ filename: "x.csv", scope: "all" })).toEqual({
      filename: "x.csv",
      scope: "all",
    });
  });
});

describe("exportableColumns", () => {
  it("drops the synthetic actions and reorder columns", () => {
    expect(exportableColumns(COLS).map((c) => c.key)).toEqual(["name", "age"]);
  });
});

describe("buildTableCsv", () => {
  it("exports the current page by default", () => {
    const csv = buildTableCsv({
      source: source(PAGE, ALL),
      columns: COLS,
    });
    expect(csv).toBe("Name,Age\r\nAda,36\r\nGrace,85");
  });

  it("exports allFilteredRows when scope is all", () => {
    const csv = buildTableCsv({
      source: source(PAGE, ALL),
      columns: COLS,
      scope: "all",
    });
    expect(csv.split("\r\n")).toEqual([
      "Name,Age",
      "Ada,36",
      "Grace,85",
      "Alan,41",
    ]);
  });

  it("falls back to page rows with a devWarn when allFilteredRows is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const csv = buildTableCsv({
      source: source(PAGE),
      columns: COLS,
      scope: "all",
    });
    expect(csv).toBe("Name,Age\r\nAda,36\r\nGrace,85");
    // The warning has to name the way out, not just the limitation: this call
    // bypasses the toolbar handler, which refuses to render the button at all.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("`onExportAll`, `request`, or `fetchAll`")
    );
  });

  it("writes group headers when the chrome view is passed in", () => {
    const csv = buildTableCsv({
      source: source(PAGE, ALL),
      columns: COLS,
      context: {
        getRowId: (row) => row.id,
        grouping: {
          entries: [
            {
              kind: "group",
              key: "g",
              value: "Core",
              label: "Core",
              level: 0,
              groupBy: "name",
              path: ["Core"],
              leafRows: PAGE,
              leafIds: ["1", "2"],
              collapsed: false,
            },
            {
              kind: "row",
              key: "1",
              row: PAGE[0]!,
              index: 0,
              groupKey: "g",
            },
          ],
        },
      },
    });
    expect(csv).toContain("Core");
    expect(csv).toContain("Ada");
  });

  it("keeps a collapsed header on the page and unfolds it for all / selected", () => {
    const collapsed = {
      grouping: {
        entries: [
          {
            kind: "group" as const,
            key: "g",
            value: "Core",
            label: "Core",
            level: 0,
            groupBy: "name",
            path: ["Core"],
            leafRows: PAGE,
            leafIds: ["1", "2"],
            collapsed: true,
          },
        ],
      },
      getRowId: (row: Person) => row.id,
    };
    const page = buildTableCsv({
      source: source(PAGE, ALL),
      columns: COLS,
      context: collapsed,
    });
    expect(page).toContain("Core");
    expect(page).not.toContain("Ada");

    const all = buildTableCsv({
      source: source(PAGE, ALL),
      columns: COLS,
      scope: "all",
      context: collapsed,
    });
    expect(all).toContain("Ada");
    expect(all).toContain("Grace");

    const selected = buildTableCsv({
      source: source(PAGE, ALL),
      columns: COLS,
      scope: "selected",
      context: {
        ...collapsed,
        selectedIds: new Set(["1"]),
      },
    });
    expect(selected).toContain("Ada");
    expect(selected).not.toContain("Grace");
  });

  it("ignores grouping when the export is a highlighted rectangle", () => {
    const csv = buildTableCsv({
      source: source(PAGE, ALL),
      columns: COLS,
      scope: "range",
      context: {
        getRowId: (row) => row.id,
        range: {
          anchor: { row: 0, col: 0 },
          head: { row: 0, col: 0 },
        },
        grouping: {
          entries: [
            {
              kind: "group",
              key: "g",
              value: "Core",
              label: "Core",
              level: 0,
              groupBy: "name",
              path: ["Core"],
              leafRows: PAGE,
              leafIds: ["1", "2"],
              collapsed: false,
            },
            {
              kind: "row",
              key: "1",
              row: PAGE[0]!,
              index: 0,
              groupKey: "g",
            },
          ],
        },
      },
    });
    expect(csv).toBe("Name\r\nAda");
    expect(csv).not.toContain("Core");
  });

  it("appends a summary row and drops JSX totals", () => {
    const csv = buildTableCsv({
      source: source(PAGE, ALL),
      columns: COLS,
      context: {
        summaryRow: () => ({
          age: 121,
          name: createElement("span", null, "Total"),
        }),
      },
    });
    expect(csv.split("\r\n").at(-1)).toBe(",121");
  });
});

describe("makeExportCsvHandler", () => {
  it("returns undefined when export is off", () => {
    expect(makeExportCsvHandler(undefined, source(PAGE), COLS)).toBeUndefined();
    expect(makeExportCsvHandler(false, source(PAGE), COLS)).toBeUndefined();
  });

  it("returns a callable handler when export is on", () => {
    expect(typeof makeExportCsvHandler(true, source(PAGE), COLS)).toBe(
      "function"
    );
  });
});
