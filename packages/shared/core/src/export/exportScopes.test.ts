/**
 * Export scopes: which rows and which columns end up in the file.
 *
 * The scopes exist because "export" means different things at different
 * moments — what I can see, everything that matched, or just the rows I
 * ticked — and picking one should never require rebuilding the data by hand.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnModel } from "../columnModel";
import type { TableSource } from "../source/TableSource";
import { resetDevWarnings } from "../utils/devWarn";
import { buildTableCsv, resolveExportColumns } from "./tableCsv";

interface Row {
  id: string;
  name: string;
  team: string;
  secret: string;
}

const ALL_ROWS: Row[] = [
  { id: "1", name: "Ada", team: "Core", secret: "x" },
  { id: "2", name: "Linus", team: "Web", secret: "y" },
  { id: "3", name: "Grace", team: "Core", secret: "z" },
];

// Accessors are present because `resolveColumns` fills them in from the key
// path before any column reaches an export.
const VISIBLE: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
  { key: "team", header: "Team", exportValue: (row) => row.team },
];
const ALL_COLUMNS: ColumnModel<Row>[] = [
  ...VISIBLE,
  { key: "secret", header: "Secret", exportValue: (row) => row.secret },
];

/** A complete source showing page 2 (one row) of a filtered set of three. */
function source(
  allFilteredRows: readonly Row[] | undefined = ALL_ROWS
): TableSource<Row> {
  const rows = [ALL_ROWS[1]!];
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

/** A server-backed source: paginated, with no way to rebuild the full set. */
function serverSource(): TableSource<Row> {
  return { ...source(), allFilteredRows: undefined };
}

const getRowId = (row: Row) => row.id;

describe("export row scopes", () => {
  beforeEach(() => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("exports the page on screen by default", () => {
    const csv = buildTableCsv({ source: source(), columns: VISIBLE });
    expect(csv).toContain("Linus");
    expect(csv).not.toContain("Ada");
  });

  it("exports everything that matched when asked for all", () => {
    const csv = buildTableCsv({
      source: source(),
      columns: VISIBLE,
      scope: "all",
    });
    expect(csv).toContain("Ada");
    expect(csv).toContain("Grace");
  });

  it("exports rows ticked on other pages, not just the visible one", () => {
    const csv = buildTableCsv({
      source: source(),
      columns: VISIBLE,
      scope: "selected",
      context: { selectedIds: new Set(["1", "3"]), getRowId },
    });
    // Ada and Grace are selected but off-screen; Linus is on screen, unticked.
    expect(csv).toContain("Ada");
    expect(csv).toContain("Grace");
    expect(csv).not.toContain("Linus");
  });

  it("keeps table order in a selected export, not selection order", () => {
    const csv = buildTableCsv({
      source: source(),
      columns: VISIBLE,
      scope: "selected",
      context: { selectedIds: new Set(["3", "1"]), getRowId },
    });
    expect(csv.indexOf("Ada")).toBeLessThan(csv.indexOf("Grace"));
  });

  it("writes a header-only file when nothing is ticked", () => {
    const csv = buildTableCsv({
      source: source(),
      columns: VISIBLE,
      scope: "selected",
      context: { selectedIds: new Set<string>(), getRowId },
    });
    expect(csv.trim()).toBe("Name,Team");
  });

  it("falls back to the page, with a warning, when selection is unavailable", () => {
    const csv = buildTableCsv({
      source: source(),
      columns: VISIBLE,
      scope: "selected",
    });
    expect(csv).toContain("Linus");
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain("selected");
  });

  it("falls back to the page, with a warning, when a server source cannot rebuild the set", () => {
    const csv = buildTableCsv({
      source: serverSource(),
      columns: VISIBLE,
      scope: "all",
    });
    expect(csv).toContain("Linus");
    expect(csv).not.toContain("Ada");
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain('scope "all"');
  });
});

/**
 * The range scope, which is the only one whose addresses come from somewhere
 * else — cell navigation numbers rows within the dataset, so every test here is
 * really about that number surviving the trip.
 */
describe("export range scope", () => {
  beforeEach(() => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  /** A source with all three rows loaded, as an unpaged table has. */
  const loaded = (): TableSource<Row> => ({ ...source(), rows: ALL_ROWS });

  const range = (anchor: [number, number], head: [number, number]) => ({
    anchor: { row: anchor[0], col: anchor[1] },
    head: { row: head[0], col: head[1] },
  });

  it("exports the rectangle and nothing outside it", () => {
    const csv = buildTableCsv({
      source: loaded(),
      columns: VISIBLE,
      scope: "range",
      context: { range: range([0, 0], [1, 0]) },
    });
    expect(csv).toBe("Name\r\nAda\r\nLinus");
  });

  it("reads a rectangle dragged upward the same as one dragged down", () => {
    const csv = buildTableCsv({
      source: loaded(),
      columns: VISIBLE,
      scope: "range",
      context: { range: range([2, 1], [1, 0]) },
    });
    expect(csv).toBe("Name,Team\r\nLinus,Web\r\nGrace,Core");
  });

  it("offsets a range by where the page starts", () => {
    // Cell navigation numbers rows within the DATASET, so row 5 of page 3 is
    // `rows[0]` in the browser. Getting this wrong exports the wrong people.
    const csv = buildTableCsv({
      source: { ...source(), rows: [ALL_ROWS[2]!] },
      columns: VISIBLE,
      scope: "range",
      context: { range: range([5, 0], [5, 1]), firstRowIndex: 5 },
    });
    expect(csv).toBe("Name,Team\r\nGrace,Core");
  });

  it("skips rows the browser does not hold rather than exporting blanks", () => {
    const csv = buildTableCsv({
      source: loaded(),
      columns: VISIBLE,
      scope: "range",
      context: { range: range([2, 0], [9, 0]) },
    });
    expect(csv).toBe("Name\r\nGrace");
  });

  it("lets the rectangle decide the columns, even when all were asked for", () => {
    // A user who highlighted one column and then received every column,
    // including hidden ones, would rightly call that a bug.
    const csv = buildTableCsv({
      source: loaded(),
      columns: VISIBLE,
      scope: "range",
      columnScope: "all",
      context: { range: range([0, 1], [0, 1]), allColumns: ALL_COLUMNS },
    });
    expect(csv).toBe("Team\r\nCore");
  });

  it("falls back to the page, with a warning, when nothing is selected", () => {
    const csv = buildTableCsv({
      source: source(),
      columns: VISIBLE,
      scope: "range",
    });
    expect(csv).toContain("Linus");
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain(
      'scope "range"'
    );
  });
});

describe("export column scopes", () => {
  it("exports what the user can see by default", () => {
    expect(
      resolveExportColumns(undefined, VISIBLE, ALL_COLUMNS).map((c) => c.key)
    ).toEqual(["name", "team"]);
  });

  it("includes columns hidden through the column menu when asked for all", () => {
    expect(
      resolveExportColumns("all", VISIBLE, ALL_COLUMNS).map((c) => c.key)
    ).toEqual(["name", "team", "secret"]);
  });

  it("takes an explicit list in the order given", () => {
    expect(
      resolveExportColumns(["secret", "name"], VISIBLE, ALL_COLUMNS).map(
        (c) => c.key
      )
    ).toEqual(["secret", "name"]);
  });

  it("ignores a key matching no column, so a stale config cannot break export", () => {
    expect(
      resolveExportColumns(["name", "gone"], VISIBLE, ALL_COLUMNS).map(
        (c) => c.key
      )
    ).toEqual(["name"]);
  });

  it("falls back to the visible set when the full set was never supplied", () => {
    expect(
      resolveExportColumns("all", VISIBLE, undefined).map((c) => c.key)
    ).toEqual(["name", "team"]);
  });
});
