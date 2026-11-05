/**
 * Body render and window plans.
 *
 * Everything a table body decides before it renders — which columns and
 * cells, whether a window may arm and which one, where the infinite sentinel
 * counts, where to scroll to reveal a row, and the spacer arithmetic over a
 * virtualizer's slice — is computed here, so every binding windows the same
 * way. These pin that arithmetic down, branch by branch.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CARD_SIZE_PX, DEFAULT_ROW_SIZE_PX } from "../constants";
import type { ColumnMetadata } from "../contracts/columns";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { BodyCell } from "../rows/cellSpan";
import type { ExtraRow } from "../rows/extraRows";
import {
  attachIncrementalView,
  type IncrementalView,
} from "../rows/incremental";
import { pinnedSummaryRowId } from "../rows/pinnedSummaryRows";
import type { TreeEntry } from "../tree/treeRows";
import {
  asSizeEstimator,
  bodyCanLoadMore,
  bodySentinelCount,
  bodyWindowKind,
  chromeRenderModel,
  columnWindowPlan,
  EndReachedLatch,
  estimateBodyItemSize,
  fetchNextBodyPage,
  hasLoadedChildren,
  isBodyEligible,
  keyedWindow,
  materializeWindowRows,
  pendingListSize,
  pinnedScrollRows,
  readColumnViewport,
  resolveBodyVirtualization,
  RowPairMeasureController,
  rowScrollTarget,
  rowWindow,
  SummaryCellsCache,
  virtualizeIgnoredOnPage,
  type WindowVirtualizer,
  withSourceIndices,
} from "./bodyWindow";
import type { VirtualItemMeta } from "./virtualTableModel";

interface Row {
  id: string;
  parent?: string;
  kids?: Row[];
}

const rowKey = (row: Row) => row.id;
const ROWS: Row[] = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const COLUMNS: ColumnMetadata<Row>[] = [{ key: "x" }, { key: "y" }];
const LABELS = { empty: "Nothing" };

function item(index: number, start: number, size = 10): VirtualItemMeta {
  return { index, start, end: start + size, size, key: index, lane: 0 };
}

function virtualizer(total: number, scrollMargin?: number): WindowVirtualizer {
  return {
    getTotalSize: () => total,
    options: { scrollMargin },
    measureElement: vi.fn(),
  };
}

function treeEntry(row: Row): TreeEntry<Row> {
  return {
    row,
    key: row.id,
    level: 0,
    hasChildren: false,
    expanded: false,
    path: [],
    descendantIds: [],
  };
}

function groupRow(row: Row, index: number): GroupedFlatEntry<Row> {
  return { kind: "row", key: row.id, row, index, groupKey: "g" };
}

const GROUP_HEADER: GroupedFlatEntry<Row> = {
  kind: "group",
  key: "group:g",
  value: "g",
  label: "g",
  level: 0,
  groupBy: "x",
  path: ["g"],
  leafRows: [],
  leafIds: [],
  collapsed: false,
};

const cellKeys = (cells: readonly BodyCell<Row>[] | undefined) =>
  cells?.map((cell) => cell.column.key);

/* ── Render model ──────────────────────────────────────────────────── */

describe("chromeRenderModel", () => {
  it("renders every column and row with no chrome when nothing is composed", () => {
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: ROWS,
      getRowId: rowKey,
    });
    expect(model.columns).toBe(COLUMNS);
    expect(model.selection).toBeNull();
    expect(model.labels).toBe(LABELS);
    expect(model.showActions).toBe(false);
    expect(model.showReorder).toBe(false);
    expect(model.leadingCells).toBe(0);
    expect(model.entries.map((entry) => entry.key)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(model.columnSpan).toBe(2);
    expect(model.columnSpacers).toBeUndefined();
    expect([...model.cellsByRow.keys()]).toEqual(["a", "b", "c", "d"]);
    expect(cellKeys(model.cellsByRow.get("a"))).toEqual(["x", "y"]);
    expect(model.extraCoveredSlots.size).toBe(0);
  });

  it("injects the chrome columns each composed feature asks for", () => {
    const selection = { ids: new Set<string>() };
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection, labels: LABELS },
      rows: ROWS,
      getRowId: rowKey,
      rowActions: [{}],
      rowReorder: {},
      renderRowDetail: () => null,
      expansion: {},
    });
    expect(model.selection).toBe(selection);
    expect(model.showActions).toBe(true);
    expect(model.showReorder).toBe(true);
    expect(model.leadingCells).toBe(3);
    // Two data columns + selection, actions, chevron and grip.
    expect(model.columnSpan).toBe(6);
  });

  it("keeps a control column for row-mode editing even with no row actions", () => {
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: ROWS,
      getRowId: rowKey,
      editing: { rowEditing: {} },
      renderRowDetail: () => null,
    });
    expect(model.showActions).toBe(true);
    // A detail renderer with no expansion state is no chevron column.
    expect(model.leadingCells).toBe(0);
  });

  it("windows the columns, adding the two spacers to the span", () => {
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: ROWS,
      getRowId: rowKey,
      columnWindow: {
        enabled: true,
        columns: [COLUMNS[1]!],
        paddingStart: 160,
        paddingEnd: 40,
      },
    });
    expect(model.columns.map((column) => column.key)).toEqual(["y"]);
    expect(model.columnSpan).toBe(3);
    expect(model.columnSpacers).toEqual({ start: 160, end: 40 });
    // Cells keep their place in the full column set but only the window's.
    const cells = model.cellsByRow.get("a");
    expect(cellKeys(cells)).toEqual(["y"]);
    expect(cells?.[0]?.columnIndex).toBe(1);
  });

  it("ignores a column window that is not enabled", () => {
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: ROWS,
      getRowId: rowKey,
      columnWindow: {
        enabled: false,
        columns: [COLUMNS[1]!],
        paddingStart: 160,
        paddingEnd: 40,
      },
    });
    expect(model.columns).toBe(COLUMNS);
    expect(model.columnSpan).toBe(2);
    expect(model.columnSpacers).toBeUndefined();
  });

  it("drops pinned rows from the entries yet still builds their cells", () => {
    const entries = ROWS.map((row, index) => ({ row, index, key: row.id }));
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: ROWS,
      getRowId: rowKey,
      rowEntries: entries,
      pinnedTopRows: [ROWS[0]!],
      pinnedBottomRows: [ROWS[3]!],
    });
    expect(model.entries.map((entry) => entry.key)).toEqual(["b", "c"]);
    expect([...model.cellsByRow.keys()]).toEqual(["a", "b", "c", "d"]);
  });

  it("uses the virtualizer's entries as they are when nothing is pinned", () => {
    const entries = [{ row: ROWS[2]!, index: 2, key: "c" }];
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: ROWS,
      getRowId: rowKey,
      rowEntries: entries,
    });
    expect(model.entries).toBe(entries);
    expect([...model.cellsByRow.keys()]).toEqual(["c"]);
  });

  it("builds cells for summary rows under their pinned-summary ids", () => {
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: [],
      getRowId: rowKey,
      pinnedSummaryTop: [{ id: "total" }],
      pinnedSummaryBottom: [{ id: "avg" }, { id: "max" }],
    });
    expect([...model.cellsByRow.keys()]).toEqual([
      pinnedSummaryRowId("top", 0),
      pinnedSummaryRowId("bottom", 0),
      pinnedSummaryRowId("bottom", 1),
    ]);
  });

  it("builds cells for grouped leaves, starting at the first leaf's index", () => {
    const buildBodyCells = vi.fn(
      (options: { rows: readonly Row[]; getRowId: (row: Row) => string }) =>
        new Map<string, readonly BodyCell<Row>[]>(
          options.rows.map((row) => [options.getRowId(row), []])
        )
    );
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: [],
      getRowId: rowKey,
      grouping: {
        entries: [GROUP_HEADER, groupRow(ROWS[1]!, 4), groupRow(ROWS[2]!, 5)],
      },
      assembly: { buildBodyCells },
    });
    expect([...model.cellsByRow.keys()]).toEqual(["b", "c"]);
    expect(buildBodyCells).toHaveBeenLastCalledWith(
      expect.objectContaining({ firstRowIndex: 4 })
    );
  });

  it("builds nothing extra for a grouping with no leaves", () => {
    const buildBodyCells = vi.fn(() => new Map());
    chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: [],
      getRowId: rowKey,
      grouping: { entries: [GROUP_HEADER] },
      assembly: { buildBodyCells },
    });
    expect(buildBodyCells).toHaveBeenCalledTimes(1);
  });

  it("builds cells for the tree's walked entries rather than the row list", () => {
    const child: Row = { id: "child" };
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: null, labels: LABELS },
      rows: [ROWS[0]!],
      getRowId: rowKey,
      tree: { entries: [treeEntry(ROWS[0]!), treeEntry(child)] },
    });
    expect([...model.cellsByRow.keys()]).toEqual(["a", "child"]);
  });

  it("takes the inflated cells when row spans cross extra rows", () => {
    const inflated = new Map<string, readonly BodyCell<Row>[]>([
      ["a", [{ column: COLUMNS[0]!, columnIndex: 0, colSpan: 1, rowSpan: 2 }]],
    ]);
    const inflateBodyCellRowSpans = vi.fn(() => inflated);
    const extraCoveredTableSlots = vi.fn(() => new Set([1]));
    const extraRows: ExtraRow[] = [
      { key: "e1", kind: "separator", beforeRowId: "b" },
      { key: "e2", kind: "separator", beforeRowId: "b" },
      { key: "e3", kind: "separator" },
    ];
    const model = chromeRenderModel({
      table: { columns: COLUMNS, selection: { any: true }, labels: LABELS },
      rows: ROWS.slice(0, 2),
      getRowId: rowKey,
      extraRows,
      assembly: { inflateBodyCellRowSpans, extraCoveredTableSlots },
    });
    expect([...model.cellsByRow.keys()]).toEqual(["a"]);
    expect(model.cellsByRow.get("a")?.[0]?.rowSpan).toBe(2);
    expect(inflateBodyCellRowSpans).toHaveBeenCalledWith(
      expect.any(Map),
      ["a", "b"],
      extraRows
    );
    // One lookup per anchor row, with the leading chrome passed through.
    expect(extraCoveredTableSlots).toHaveBeenCalledTimes(1);
    expect(extraCoveredTableSlots).toHaveBeenCalledWith(
      "b",
      expect.objectContaining({ visualIds: ["a", "b"], leadingCells: 1 })
    );
    expect(model.extraCoveredSlots.get("b")).toEqual(new Set([1]));
  });
});

/* ── Summary cells ─────────────────────────────────────────────────── */

describe("SummaryCellsCache", () => {
  it("is undefined with no builder and no view aggregates", () => {
    expect(
      new SummaryCellsCache<string>().read(undefined, ROWS)
    ).toBeUndefined();
  });

  it("runs the builder once per row set, whatever its identity", () => {
    const cache = new SummaryCellsCache<string>();
    const first = vi.fn(() => "sum-1");
    expect(cache.read(first, ROWS)).toBe("sum-1");
    // A fresh inline builder on the same rows must not re-walk them.
    const second = vi.fn(() => "sum-2");
    expect(cache.read(second, ROWS)).toBe("sum-1");
    expect(second).not.toHaveBeenCalled();
    const next = [...ROWS];
    expect(cache.read(second, next)).toBe("sum-2");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(next);
  });

  it("recomputes when the builder is switched off", () => {
    const cache = new SummaryCellsCache<string>();
    expect(cache.read(() => "sum", ROWS)).toBe("sum");
    expect(cache.read(undefined, ROWS)).toBeUndefined();
  });

  it("prefers the aggregates an incremental view already carries", () => {
    const rows: Row[] = [{ id: "a" }];
    const aggregates = { x: "42" };
    const view: IncrementalView<Row> = {
      rows,
      filtered: rows,
      sorted: rows,
      groups: undefined,
      aggregates,
    };
    attachIncrementalView(rows, view);
    const cache = new SummaryCellsCache<typeof aggregates>();
    const builder = vi.fn(() => ({ x: "never" }));
    expect(cache.read(builder, rows)).toBe(aggregates);
    expect(cache.read(undefined, rows)).toBe(aggregates);
    expect(builder).not.toHaveBeenCalled();
  });
});

/* ── Body eligibility and the sentinel ─────────────────────────────── */

interface FakeSource {
  rows: readonly Row[];
  error: Error | null;
  paginationMode: "infinite" | "paged";
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

const source = (overrides: Partial<FakeSource> = {}): FakeSource => ({
  rows: ROWS,
  error: null,
  paginationMode: "infinite",
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  ...overrides,
});

describe("isBodyEligible", () => {
  const base = { isPaged: false, source: source(), body: "desktop" };

  it("windows a desktop or mobile list that is not paged", () => {
    expect(isBodyEligible(base)).toBe(true);
    expect(isBodyEligible({ ...base, body: "mobile" })).toBe(true);
  });

  it("refuses any other body — empty, loading, error states", () => {
    expect(isBodyEligible({ ...base, body: "empty" })).toBe(false);
  });

  it("refuses a body whose source errored", () => {
    expect(
      isBodyEligible({ ...base, source: source({ error: new Error("x") }) })
    ).toBe(false);
  });

  it("refuses a flat page, which the page size already bounds", () => {
    expect(isBodyEligible({ ...base, isPaged: true })).toBe(false);
  });

  it("accepts a page grouping or a tree has expanded", () => {
    expect(
      isBodyEligible({ ...base, isPaged: true, grouping: { entries: [] } })
    ).toBe(true);
    expect(
      isBodyEligible({ ...base, isPaged: true, tree: { entries: [] } })
    ).toBe(true);
  });
});

describe("virtualizeIgnoredOnPage", () => {
  const paged = source({ paginationMode: "paged" });

  it("flags virtualize asked of a flat paged table", () => {
    expect(virtualizeIgnoredOnPage(true, { source: paged })).toBe(true);
  });

  it("is quiet when virtualize is off, the list is infinite, or expanded", () => {
    expect(virtualizeIgnoredOnPage(false, { source: paged })).toBe(false);
    expect(virtualizeIgnoredOnPage(true, { source: source() })).toBe(false);
    expect(
      virtualizeIgnoredOnPage(true, {
        source: paged,
        grouping: { entries: [] },
      })
    ).toBe(false);
    expect(
      virtualizeIgnoredOnPage(true, { source: paged, tree: { entries: [] } })
    ).toBe(false);
  });
});

describe("estimateBodyItemSize", () => {
  it("falls back to a row on desktop and a card on a phone", () => {
    expect(estimateBodyItemSize({ isMobile: false }, {}, ROWS)(0)).toBe(
      DEFAULT_ROW_SIZE_PX
    );
    expect(estimateBodyItemSize({ isMobile: true }, {}, ROWS)(0)).toBe(
      DEFAULT_CARD_SIZE_PX
    );
  });

  it("takes the host's own estimates for each layout", () => {
    const options = { estimateRowSize: 44, estimateCardSize: 200 };
    expect(estimateBodyItemSize({ isMobile: false }, options, ROWS)(0)).toBe(
      44
    );
    expect(estimateBodyItemSize({ isMobile: true }, options, ROWS)(0)).toBe(
      200
    );
  });

  it("uses a constant rowHeight for every item", () => {
    expect(
      estimateBodyItemSize({ isMobile: false }, { rowHeight: 30 }, ROWS)(3)
    ).toBe(30);
  });

  const byId = (row: Row, index: number) => (row.id === "b" ? 90 : 10 + index);

  it("sizes a flat row from the scroll list, falling back past its end", () => {
    const sizeOf = estimateBodyItemSize(
      { isMobile: false },
      { rowHeight: byId },
      ROWS
    );
    expect(sizeOf(1)).toBe(90);
    expect(sizeOf(2)).toBe(12);
    expect(sizeOf(9)).toBe(DEFAULT_ROW_SIZE_PX);
  });

  it("sizes a grouped leaf by its leaf index, and a header by the fallback", () => {
    const sizeOf = estimateBodyItemSize(
      {
        isMobile: false,
        grouping: { entries: [GROUP_HEADER, groupRow(ROWS[2]!, 7)] },
      },
      { rowHeight: byId },
      []
    );
    expect(sizeOf(0)).toBe(DEFAULT_ROW_SIZE_PX);
    expect(sizeOf(1)).toBe(17);
    expect(sizeOf(2)).toBe(DEFAULT_ROW_SIZE_PX);
  });

  it("sizes a tree row from the walked entry, falling back past its end", () => {
    const sizeOf = estimateBodyItemSize(
      { isMobile: true, tree: { entries: [treeEntry(ROWS[1]!)] } },
      { rowHeight: byId },
      []
    );
    expect(sizeOf(0)).toBe(90);
    expect(sizeOf(1)).toBe(DEFAULT_CARD_SIZE_PX);
  });
});

describe("bodySentinelCount", () => {
  it("counts grouped entries when grouping renders, source rows otherwise", () => {
    expect(bodySentinelCount({ source: source() })).toBe(4);
    expect(
      bodySentinelCount({
        source: source(),
        grouping: { entries: [GROUP_HEADER, groupRow(ROWS[0]!, 0)] },
      })
    ).toBe(2);
  });
});

describe("bodyCanLoadMore", () => {
  it("applies to an infinite list with no error and no boxed window", () => {
    expect(bodyCanLoadMore({ isPaged: false, source: {} })).toBe(true);
    expect(bodyCanLoadMore({ isPaged: true, source: {} })).toBe(false);
    expect(bodyCanLoadMore({ isPaged: false, source: { error: "x" } })).toBe(
      false
    );
    expect(bodyCanLoadMore({ isPaged: false, source: {} }, true)).toBe(false);
  });
});

describe("fetchNextBodyPage", () => {
  it("fetches only when there is a next page not already in flight", () => {
    const ready = source({ hasNextPage: true });
    fetchNextBodyPage(ready);
    expect(ready.fetchNextPage).toHaveBeenCalledTimes(1);

    const inFlight = source({ hasNextPage: true, isFetchingNextPage: true });
    fetchNextBodyPage(inFlight);
    expect(inFlight.fetchNextPage).not.toHaveBeenCalled();

    const done = source({ hasNextPage: false });
    fetchNextBodyPage(done);
    expect(done.fetchNextPage).not.toHaveBeenCalled();
  });
});

describe("pinnedScrollRows", () => {
  it("scrolls every row when nothing is pinned", () => {
    expect(pinnedScrollRows(ROWS, undefined, rowKey)).toEqual({
      top: [],
      scroll: ROWS,
      bottom: [],
    });
  });

  it("pulls the pinned rows out of the scroll list", () => {
    const parts = pinnedScrollRows(ROWS, { top: ["c"], bottom: ["a"] }, rowKey);
    expect(parts.top.map(rowKey)).toEqual(["c"]);
    expect(parts.scroll.map(rowKey)).toEqual(["b", "d"]);
    expect(parts.bottom.map(rowKey)).toEqual(["a"]);
  });
});

describe("hasLoadedChildren", () => {
  it("reads nested children when the host provides them", () => {
    const getChildren = (row: Row) => row.kids;
    expect(
      hasLoadedChildren({ id: "p", kids: [{ id: "k" }] }, [], {
        getChildren,
        rowKey,
      })
    ).toBe(true);
    expect(
      hasLoadedChildren({ id: "p", kids: [] }, [], { getChildren, rowKey })
    ).toBe(false);
  });

  it("looks for a row naming it as parent when children are flat", () => {
    const getParentId = (row: Row) => row.parent;
    const rows: Row[] = [{ id: "p" }, { id: "k", parent: "p" }];
    const options = {
      getChildren: (row: Row) => row.kids,
      getParentId,
      rowKey,
    };
    expect(hasLoadedChildren(rows[0]!, rows, options)).toBe(true);
    expect(hasLoadedChildren(rows[1]!, rows, options)).toBe(false);
  });

  it("is false with no way to find children", () => {
    expect(hasLoadedChildren({ id: "p" }, ROWS, { rowKey })).toBe(false);
  });
});

/* ── Which window is armed ─────────────────────────────────────────── */

describe("bodyWindowKind", () => {
  const base = { isPaged: false, source: source(), body: "desktop" };

  it("arms nothing when virtualize is off or the body is ineligible", () => {
    expect(bodyWindowKind(false, base)).toBe("none");
    expect(bodyWindowKind(true, { ...base, body: "loading" })).toBe("none");
  });

  it("ranks grouping above a tree, and a flat window below both", () => {
    const tree = { entries: [] };
    const grouping = { entries: [] };
    expect(bodyWindowKind(true, { ...base, tree, grouping })).toBe("grouped");
    expect(bodyWindowKind(true, { ...base, tree })).toBe("tree");
    expect(bodyWindowKind(true, base)).toBe("flat");
  });
});

describe("resolveBodyVirtualization", () => {
  const flat = {
    enabled: true,
    rows: [{ row: ROWS[0]!, index: 0, key: "a" }],
    paddingTop: 1,
    paddingBottom: 2,
  };

  it("keeps the flat window when no keyed window is armed", () => {
    expect(
      resolveBodyVirtualization(
        { enabled: false, indices: [0], paddingTop: 0, paddingBottom: 0 },
        flat
      )
    ).toBe(flat);
  });

  it("stands the keyed window's spacers in for the flat one", () => {
    const measureElement = vi.fn();
    expect(
      resolveBodyVirtualization(
        {
          enabled: true,
          indices: [3],
          paddingTop: 30,
          paddingBottom: 70,
          measureElement,
        },
        flat
      )
    ).toEqual({
      enabled: true,
      rows: [],
      paddingTop: 30,
      paddingBottom: 70,
      measureElement,
    });
  });
});

describe("withSourceIndices", () => {
  it("points each entry at its row's index in the page", () => {
    const window = {
      enabled: true,
      rows: [
        { row: ROWS[2]!, index: 0, key: "c" },
        { row: { id: "zz" }, index: 5, key: "zz" },
      ],
      paddingTop: 4,
      paddingBottom: 8,
    };
    const result = withSourceIndices(window, ROWS, rowKey);
    expect(result.paddingTop).toBe(4);
    expect(result.paddingBottom).toBe(8);
    // A row the page does not hold keeps its window index.
    expect(result.rows.map((entry) => entry.sourceIndex)).toEqual([2, 5]);
  });
});

describe("rowScrollTarget", () => {
  const offKeyed = {
    virtualization: { enabled: false, indices: [] },
    keys: [],
  };
  const flatOn = (rendered: string[]) => ({
    virtualization: {
      enabled: true,
      rows: rendered.map((id, index) => ({ row: { id }, index, key: id })),
    },
    rows: ROWS,
  });

  it("scrolls the flat window to a row it has not rendered", () => {
    expect(rowScrollTarget(ROWS[3]!, rowKey, flatOn(["a"]), offKeyed)).toEqual({
      window: "flat",
      index: 3,
    });
  });

  it("never fights the reader over a row already rendered", () => {
    expect(
      rowScrollTarget(ROWS[0]!, rowKey, flatOn(["a"]), offKeyed)
    ).toBeUndefined();
  });

  it("does nothing for a row the flat list does not hold", () => {
    expect(
      rowScrollTarget({ id: "nope" }, rowKey, flatOn(["a"]), offKeyed)
    ).toBeUndefined();
  });

  const flatOff = {
    virtualization: { enabled: false, rows: [] },
    rows: ROWS,
  };

  it("does nothing when neither window is armed", () => {
    expect(
      rowScrollTarget(ROWS[0]!, rowKey, flatOff, offKeyed)
    ).toBeUndefined();
  });

  it("scrolls the keyed window to an entry outside it", () => {
    const keyed = {
      virtualization: { enabled: true, indices: [0, 1] },
      keys: ["g", "a", "b", "c"],
    };
    expect(rowScrollTarget(ROWS[2]!, rowKey, flatOff, keyed)).toEqual({
      window: "keyed",
      index: 3,
    });
    expect(rowScrollTarget(ROWS[0]!, rowKey, flatOff, keyed)).toBeUndefined();
    expect(
      rowScrollTarget({ id: "nope" }, rowKey, flatOff, keyed)
    ).toBeUndefined();
  });
});

/* ── Window arithmetic ─────────────────────────────────────────────── */

describe("asSizeEstimator", () => {
  it("reads a constant or a per-index function", () => {
    expect(asSizeEstimator(40)(9)).toBe(40);
    const fn = (index: number) => index * 2;
    expect(asSizeEstimator(fn)).toBe(fn);
  });
});

describe("pendingListSize", () => {
  it("prefers the measured size, else estimates, and is 0 only when empty", () => {
    expect(pendingListSize(10, 123, 40)).toBe(123);
    expect(pendingListSize(0, 0, 40)).toBe(0);
    expect(pendingListSize(10, 0, 40)).toBe(400);
    expect(pendingListSize(10, 0, (index) => 30 + index)).toBe(300);
  });
});

describe("materializeWindowRows", () => {
  it("materializes every row when the window is off", () => {
    expect(materializeWindowRows(ROWS.slice(0, 2), rowKey, false, [])).toEqual([
      { row: ROWS[0], index: 0, key: "a" },
      { row: ROWS[1], index: 1, key: "b" },
    ]);
  });

  it("materializes the rows under the slice, skipping any past the end", () => {
    const slice = [item(2, 20), item(9, 90)];
    expect(materializeWindowRows(ROWS, rowKey, true, slice)).toEqual([
      { row: ROWS[2], index: 2, key: "c", virtualItem: slice[0] },
    ]);
  });

  it("materializes nothing before the first slice", () => {
    expect(materializeWindowRows(ROWS, rowKey, true, [])).toEqual([]);
  });
});

describe("rowWindow", () => {
  const rows = [{ row: ROWS[0]!, index: 0, key: "a" }];
  const measureRowPair = { row: () => vi.fn(), detail: () => vi.fn() };

  it("passes every row through with no spacers when off", () => {
    expect(
      rowWindow({
        enabled: false,
        rows,
        count: 4,
        virtualizer: virtualizer(400),
        items: [],
        estimateSize: 40,
        expandable: false,
        measureRowPair,
      })
    ).toEqual({ enabled: false, rows, paddingTop: 0, paddingBottom: 0 });
  });

  it("holds the list's height with one spacer before the first slice", () => {
    const v = virtualizer(0);
    expect(
      rowWindow({
        enabled: true,
        rows: [],
        count: 4,
        virtualizer: v,
        items: [],
        estimateSize: 40,
        expandable: false,
        measureRowPair,
      })
    ).toEqual({
      enabled: true,
      rows: [],
      paddingTop: 0,
      paddingBottom: 160,
      measureElement: v.measureElement,
      measureRowPair: undefined,
    });
  });

  it("measures an expandable row as a pair, in place of the element", () => {
    const v = virtualizer(400);
    const result = rowWindow({
      enabled: true,
      rows,
      count: 4,
      virtualizer: v,
      items: [item(1, 100, 100), item(2, 200, 100)],
      estimateSize: 100,
      expandable: true,
      measureRowPair,
    });
    expect(result).toEqual({
      enabled: true,
      rows,
      paddingTop: 100,
      paddingBottom: 100,
      measureElement: undefined,
      measureRowPair,
    });
  });

  it("subtracts the scroll margin from both spacers, never below zero", () => {
    const result = rowWindow({
      enabled: true,
      rows,
      count: 4,
      virtualizer: virtualizer(100, 50),
      items: [item(0, 20, 200)],
      estimateSize: 100,
      expandable: false,
      measureRowPair: undefined,
    });
    expect(result.paddingTop).toBe(0);
    expect(result.paddingBottom).toBe(0);

    const scrolled = rowWindow({
      enabled: true,
      rows,
      count: 4,
      virtualizer: virtualizer(400, 50),
      items: [item(1, 150, 100)],
      estimateSize: 100,
      expandable: false,
      measureRowPair: undefined,
    });
    expect(scrolled.paddingTop).toBe(100);
    expect(scrolled.paddingBottom).toBe(200);
  });
});

describe("keyedWindow", () => {
  it("covers every index with no spacers when off", () => {
    expect(
      keyedWindow({
        enabled: false,
        count: 3,
        virtualizer: virtualizer(0),
        items: [],
        estimateSize: 10,
      })
    ).toEqual({
      enabled: false,
      indices: [0, 1, 2],
      paddingTop: 0,
      paddingBottom: 0,
    });
  });

  it("holds the height open before the first slice", () => {
    const v = virtualizer(0);
    expect(
      keyedWindow({
        enabled: true,
        count: 3,
        virtualizer: v,
        items: [],
        estimateSize: () => 25,
      })
    ).toEqual({
      enabled: true,
      indices: [],
      paddingTop: 0,
      paddingBottom: 75,
      measureElement: v.measureElement,
    });
  });

  it("renders the slice's indices between its spacers", () => {
    const v = virtualizer(100);
    expect(
      keyedWindow({
        enabled: true,
        count: 10,
        virtualizer: v,
        items: [item(3, 30), item(4, 40)],
        estimateSize: 10,
      })
    ).toEqual({
      enabled: true,
      indices: [3, 4],
      paddingTop: 30,
      paddingBottom: 50,
      measureElement: v.measureElement,
    });
  });
});

describe("EndReachedLatch", () => {
  it("fires once per row count while the last item stays in view", () => {
    const latch = new EndReachedLatch();
    expect(latch.check(true, 10, 9)).toBe(true);
    expect(latch.check(true, 10, 9)).toBe(false);
    // More rows loaded: the new end fires again.
    expect(latch.check(true, 20, 19)).toBe(true);
  });

  it("re-arms when the reader scrolls back off the end", () => {
    const latch = new EndReachedLatch();
    expect(latch.check(true, 10, 9)).toBe(true);
    expect(latch.check(true, 10, 5)).toBe(false);
    expect(latch.check(true, 10, 9)).toBe(true);
    expect(latch.check(true, 10, undefined)).toBe(false);
    expect(latch.check(true, 10, 9)).toBe(true);
  });

  it("never fires with no slice or an empty list", () => {
    const latch = new EndReachedLatch();
    expect(latch.check(false, 10, 9)).toBe(false);
    expect(latch.check(true, 0, undefined)).toBe(false);
  });
});

/* ── Column window ─────────────────────────────────────────────────── */

describe("readColumnViewport", () => {
  it("reads the distance scrolled, whichever way the page reads", () => {
    expect(readColumnViewport({ scrollLeft: -300, clientWidth: 500 })).toEqual({
      start: 300,
      width: 500,
    });
    expect(readColumnViewport({ scrollLeft: 300, clientWidth: 500 })).toEqual({
      start: 300,
      width: 500,
    });
  });
});

describe("columnWindowPlan", () => {
  const MANY = Array.from({ length: 20 }, (_, i) => ({ key: `c${i}` }));
  const WIDTHS = Object.fromEntries(MANY.map((column) => [column.key, 100]));
  const keys = (columns: readonly { key: string }[]) =>
    columns.map((column) => column.key);
  const plan = (start: number, extra: object = {}) =>
    columnWindowPlan({
      columns: MANY,
      enabled: true,
      viewport: { start, width: 400 },
      widths: WIDTHS,
      ...extra,
    });

  it("renders every column when off or before the viewport has a width", () => {
    const off = columnWindowPlan({
      columns: MANY,
      enabled: false,
      viewport: { start: 0, width: 400 },
    });
    expect(off).toEqual({
      enabled: false,
      columns: MANY,
      paddingStart: 0,
      paddingEnd: 0,
    });
    expect(
      columnWindowPlan({
        columns: MANY,
        enabled: true,
        viewport: { start: 0, width: 0 },
      }).enabled
    ).toBe(false);
  });

  it("keeps the columns the viewport crosses plus an overscan after them", () => {
    const window = plan(0);
    // Four visible, three overscan after; nothing before the first column.
    expect(keys(window.columns)).toEqual([
      "c0",
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
      "c6",
    ]);
    expect(window.paddingStart).toBe(0);
    expect(window.paddingEnd).toBe(1300);
  });

  it("holds the columns either side open with spacers that add up", () => {
    const window = plan(1000);
    // c10–c13 visible, c7–c9 and c14–c16 overscan.
    expect(keys(window.columns)[0]).toBe("c7");
    expect(keys(window.columns).at(-1)).toBe("c16");
    expect(window.paddingStart).toBe(700);
    expect(window.paddingEnd).toBe(300);
    expect(
      window.paddingStart + window.columns.length * 100 + window.paddingEnd
    ).toBe(2000);
  });

  it("honours a custom overscan", () => {
    const window = plan(1000, { overscan: 0 });
    expect(keys(window.columns)).toEqual(["c10", "c11", "c12", "c13"]);
    expect(window.paddingStart).toBe(1000);
    expect(window.paddingEnd).toBe(600);
  });

  it("never windows out a pinned column", () => {
    const window = plan(1500, { pinnedKeys: new Set(["c0"]) });
    expect(keys(window.columns)[0]).toBe("c0");
    expect(keys(window.columns)).toContain("c17");
    // The spacer measures scrollable columns only.
    expect(window.paddingStart).toBe(1200);
  });

  it("shows the head of the table when scrolled past everything", () => {
    const window = plan(99_999);
    // The head plus overscan either side of it: 0..6 then 3 more.
    expect(keys(window.columns)).toEqual(
      Array.from({ length: 10 }, (_, i) => `c${i}`)
    );
    expect(window.paddingStart).toBe(0);
    expect(window.paddingEnd).toBe(1000);
  });

  it("assumes a default width for an unmeasured column", () => {
    const window = columnWindowPlan({
      columns: MANY.slice(0, 5),
      enabled: true,
      viewport: { start: 0, width: 160 },
      overscan: 0,
    });
    expect(keys(window.columns)).toEqual(["c0"]);
    expect(window.paddingEnd).toBe(640);
  });

  it("renders only the pinned columns when nothing scrolls", () => {
    const pinned = MANY.slice(0, 2);
    const window = columnWindowPlan({
      columns: pinned,
      enabled: true,
      viewport: { start: 0, width: 400 },
      pinnedKeys: new Set(["c0", "c1"]),
    });
    expect(keys(window.columns)).toEqual(["c0", "c1"]);
    expect(window.paddingStart).toBe(0);
    expect(window.paddingEnd).toBe(0);
  });

  it("is an empty window for a table with no columns", () => {
    expect(
      columnWindowPlan({
        columns: [],
        enabled: true,
        viewport: { start: 0, width: 400 },
      })
    ).toEqual({ enabled: true, columns: [], paddingStart: 0, paddingEnd: 0 });
  });
});

/* ── Row-pair measurement ──────────────────────────────────────────── */

describe("RowPairMeasureController", () => {
  afterEach(() => vi.unstubAllGlobals());

  function element(height: number): Element & { height: number } {
    const node = {
      height,
      getBoundingClientRect: () => ({ height: node.height }),
    };
    return node as unknown as Element & { height: number };
  }

  const observers: FakeObserver[] = [];

  class FakeObserver {
    readonly observed = new Set<Element>();
    readonly unobserve = vi.fn((node: Element) => this.observed.delete(node));
    readonly disconnect = vi.fn(() => this.observed.clear());
    constructor(readonly callback: ResizeObserverCallback) {
      observers.push(this);
    }
    observe(node: Element) {
      this.observed.add(node);
    }
    fire(targets: Element[]) {
      this.callback(
        targets.map((target) => ({ target }) as ResizeObserverEntry),
        this
      );
    }
  }

  it("reports the row and its panel as one height", () => {
    const resizeItem = vi.fn();
    const controller = new RowPairMeasureController(resizeItem);
    controller.attach(3, "row", element(40));
    expect(resizeItem).toHaveBeenLastCalledWith(3, 40);
    controller.attach(3, "detail", element(160));
    expect(resizeItem).toHaveBeenLastCalledWith(3, 200);
  });

  it("reports nothing before the row half attaches, or at zero height", () => {
    const resizeItem = vi.fn();
    const controller = new RowPairMeasureController(resizeItem);
    controller.attach(1, "detail", element(160));
    controller.report(9);
    controller.attach(2, "row", element(0));
    expect(resizeItem).not.toHaveBeenCalled();
  });

  it("is inert with no virtualizer to report to", () => {
    const controller = new RowPairMeasureController(undefined);
    const row = element(40);
    const read = vi.spyOn(row, "getBoundingClientRect");
    controller.attach(0, "row", row);
    expect(read).not.toHaveBeenCalled();
  });

  it("does nothing on connect where ResizeObserver does not exist", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const controller = new RowPairMeasureController(vi.fn());
    const stop = controller.connect();
    expect(stop()).toBeUndefined();
  });

  it("observes both halves and re-reports on a resize of either", () => {
    vi.stubGlobal("ResizeObserver", FakeObserver);
    const resizeItem = vi.fn();
    const controller = new RowPairMeasureController(resizeItem);
    const row = element(40);
    controller.attach(0, "row", row);
    // Elements attached before connect are picked up by it.
    const stop = controller.connect();
    const observer = observers.at(-1)!;
    expect(observer.observed.has(row)).toBe(true);

    const detail = element(100);
    controller.attach(0, "detail", detail);
    expect(observer.observed.has(detail)).toBe(true);
    expect(resizeItem).toHaveBeenLastCalledWith(0, 140);

    detail.height = 300;
    resizeItem.mockClear();
    // Both halves of one item resizing report it once; strangers are ignored.
    observer.fire([row, detail, element(5)]);
    expect(resizeItem).toHaveBeenCalledTimes(1);
    expect(resizeItem).toHaveBeenLastCalledWith(0, 340);

    stop();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    // After stopping, a new element is not observed by the old instance.
    controller.attach(1, "row", element(10));
    expect(observer.observed.size).toBe(0);
  });

  it("stops observing a half that is replaced or detached", () => {
    vi.stubGlobal("ResizeObserver", FakeObserver);
    const resizeItem = vi.fn();
    const controller = new RowPairMeasureController(resizeItem);
    controller.connect();
    const observer = observers.at(-1)!;
    const first = element(40);
    const second = element(60);
    controller.attach(0, "row", first);
    // Re-attaching the same node is not a replacement.
    controller.attach(0, "row", first);
    expect(observer.unobserve).not.toHaveBeenCalled();
    controller.attach(0, "row", second);
    expect(observer.unobserve).toHaveBeenCalledWith(first);
    expect(resizeItem).toHaveBeenLastCalledWith(0, 60);

    resizeItem.mockClear();
    observer.fire([first]);
    expect(resizeItem).not.toHaveBeenCalled();

    controller.attach(0, "row", null);
    expect(observer.unobserve).toHaveBeenLastCalledWith(second);
    expect(observer.observed.size).toBe(0);
  });
});
