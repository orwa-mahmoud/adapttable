/**
 * Export formatters and lifecycle hooks.
 *
 * A cell is formatted for reading; a spreadsheet needs the value underneath.
 * `exportValue` separates the two, and the two hooks give the host the one
 * moment where the file's contents are known and nothing has happened yet.
 */
import type { ColumnModel } from "../columnModel";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TableSource } from "../source/TableSource";
import { buildTableCsv, downloadTableCsv, type ExportInfo } from "./tableCsv";

interface Row {
  id: string;
  name: string;
  budget: number;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", budget: 1240 },
  { id: "2", name: "Linus", budget: 90 },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** A money column: pretty on screen, useless in a spreadsheet. */
const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
  {
    key: "budget",
    header: "Budget",
    formatValue: (row) => money.format(row.budget),
    exportValue: (row) => row.budget,
  },
];

const source: TableSource<Row> = makeSource(ROWS);

/** A complete source, so nothing here is a cast. */
function makeSource(
  rows: readonly Row[],
  allFilteredRows?: readonly Row[]
): TableSource<Row> {
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
    limit: 25,
    defaultLimit: 25,
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

describe("per-column export values", () => {
  it("writes the number, not the formatted cell", () => {
    const csv = buildTableCsv({ source, columns: COLUMNS });
    expect(csv).toContain("Ada,1240");
    expect(csv).not.toContain("$1,240.00");
  });

  it("leaves columns without one showing what the table shows", () => {
    const csv = buildTableCsv({ source, columns: COLUMNS });
    expect(csv).toContain("Ada");
  });

  it("still escapes a formula returned by an export value", () => {
    const csv = buildTableCsv({
      source,
      columns: [{ key: "name", header: "Name", exportValue: () => "=CMD()" }],
    });
    expect(csv).toContain("'=CMD()");
  });
});

describe("export lifecycle hooks", () => {
  beforeEach(() => {
    // downloadCsv no-ops outside a browser, so these assert on the hooks.
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("sees the resolved rows, columns and filename before anything is written", () => {
    let seen: ExportInfo<Row> | undefined;
    downloadTableCsv({
      source,
      columns: COLUMNS,
      onBeforeExport: (info) => {
        seen = info;
      },
    });
    expect(seen?.rows).toHaveLength(2);
    expect(seen?.columns.map((c) => c.key)).toEqual(["name", "budget"]);
    expect(seen?.filename).toBe("export.csv");
  });

  it("cancels the export when the hook returns false", () => {
    const after = vi.fn();
    downloadTableCsv({
      source,
      columns: COLUMNS,
      onBeforeExport: () => false,
      onAfterExport: after,
    });
    // Nothing was written, so nothing is reported as written.
    expect(after).not.toHaveBeenCalled();
  });

  it("renames the file from the data", () => {
    let finalName: string | undefined;
    downloadTableCsv({
      source,
      columns: COLUMNS,
      onBeforeExport: ({ rows }) => ({ filename: `people-${rows.length}.csv` }),
      onAfterExport: ({ filename }) => {
        finalName = filename;
      },
    });
    expect(finalName).toBe("people-2.csv");
  });

  it("keeps the original name when the hook returns nothing", () => {
    let finalName: string | undefined;
    downloadTableCsv({
      source,
      columns: COLUMNS,
      filename: "chosen.csv",
      onBeforeExport: () => undefined,
      onAfterExport: ({ filename }) => {
        finalName = filename;
      },
    });
    expect(finalName).toBe("chosen.csv");
  });

  it("hands the written text to the after hook", () => {
    let text = "";
    downloadTableCsv({
      source,
      columns: COLUMNS,
      onAfterExport: ({ csv }) => {
        text = csv;
      },
    });
    expect(text).toContain("Name,Budget");
    expect(text).toContain("Ada,1240");
  });
});
