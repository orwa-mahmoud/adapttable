/**
 * The chrome's own decisions — which region renders, why it is empty, what
 * the footer and refresh indicator show, how filters clear, when the
 * selection observer speaks, and the small readings a kit announces. Every
 * binding reads these answers, so each branch is pinned here.
 */
import { describe, expect, it, vi } from "vitest";

import { REORDER_COLUMN_KEY } from "../columns/columnMenuModel";
import type { ColumnMetadata } from "../contracts/columns";
import type { GroupingPanelInteractions } from "../grouping/groupingPanelModel";
import { defaultLabels } from "../labels";
import {
  applyFeatureNoticesAttribute,
  cardSetSize,
  chromeBodyRegion,
  chromeEmptyVariant,
  chromeFeatureNotices,
  type ChromeFeatureNoticesInput,
  chromeIsRefreshing,
  chromeShowFooter,
  clearChromeFilters,
  featureNoticesAttribute,
  FilterTriggerToggleState,
  groupingPanelState,
  rowReorderEnablement,
  scrollResetKeys,
  selectionObserverIds,
  sortedColumnName,
} from "./tableChromeState";

interface Row {
  id: string;
  amount: number;
}

describe("chromeBodyRegion", () => {
  const base = { isLoading: false, rowCount: 3, isEmpty: false };

  it("shows a skeleton only while the first load has no rows", () => {
    expect(
      chromeBodyRegion({
        ...base,
        isLoading: true,
        rowCount: 0,
        isEmpty: true,
        isMobile: false,
      })
    ).toBe("skeleton");
    // Loading with rows on screen keeps them.
    expect(
      chromeBodyRegion({ ...base, isLoading: true, isMobile: false })
    ).toBe("desktop");
  });

  it("shows the empty state when nothing is left", () => {
    expect(
      chromeBodyRegion({ ...base, rowCount: 0, isEmpty: true, isMobile: true })
    ).toBe("empty");
  });

  it("picks the card list on a phone and the table on a desktop", () => {
    expect(chromeBodyRegion({ ...base, isMobile: true })).toBe("mobile");
    expect(chromeBodyRegion({ ...base, isMobile: false })).toBe("desktop");
  });
});

describe("chromeEmptyVariant", () => {
  it("is noData with no search, filter or source extras", () => {
    expect(chromeEmptyVariant({ activeFilterCount: 0, search: "" })).toBe(
      "noData"
    );
    expect(
      chromeEmptyVariant({ activeFilterCount: 0, search: "", extra: {} })
    ).toBe("noData");
  });

  it("is noResults under an active filter, source extra or search", () => {
    expect(chromeEmptyVariant({ activeFilterCount: 2, search: "" })).toBe(
      "noResults"
    );
    expect(
      chromeEmptyVariant({
        activeFilterCount: 0,
        search: "",
        extra: { team: "x" },
      })
    ).toBe("noResults");
    expect(chromeEmptyVariant({ activeFilterCount: 0, search: "ada" })).toBe(
      "noResults"
    );
  });
});

describe("chromeIsRefreshing", () => {
  it("is true only for a background fetch", () => {
    expect(
      chromeIsRefreshing({
        isFetching: true,
        isLoading: false,
        isFetchingNextPage: false,
      })
    ).toBe(true);
  });

  it("is false for the first load, a load-more or an idle source", () => {
    expect(
      chromeIsRefreshing({
        isFetching: true,
        isLoading: true,
        isFetchingNextPage: false,
      })
    ).toBe(false);
    expect(
      chromeIsRefreshing({
        isFetching: true,
        isLoading: false,
        isFetchingNextPage: true,
      })
    ).toBe(false);
    expect(
      chromeIsRefreshing({
        isFetching: false,
        isLoading: false,
        isFetchingNextPage: false,
      })
    ).toBe(false);
  });
});

describe("chromeShowFooter", () => {
  const base = {
    paginationMode: "paged" as const,
    error: null,
    total: 0,
    isLoading: false,
    isFetching: false,
  };

  it("shows for a paged source with a count, a load or a fetch", () => {
    expect(chromeShowFooter({ ...base, total: 12 })).toBe(true);
    expect(chromeShowFooter({ ...base, isLoading: true })).toBe(true);
    expect(chromeShowFooter({ ...base, isFetching: true })).toBe(true);
  });

  it("hides with nothing to count, on error, or when not paged", () => {
    expect(chromeShowFooter(base)).toBe(false);
    expect(
      chromeShowFooter({ ...base, total: 12, error: new Error("boom") })
    ).toBe(false);
    expect(
      chromeShowFooter({ ...base, total: 12, paginationMode: "infinite" })
    ).toBe(false);
  });
});

describe("clearChromeFilters", () => {
  it("clears extras and the filter tree, then notifies the host", () => {
    const order: string[] = [];
    const source = {
      clearExtras: vi.fn(() => order.push("extras")),
      setFilterTree: vi.fn(() => order.push("tree")),
    };
    const onClearFilters = vi.fn(() => order.push("host"));
    clearChromeFilters(source, onClearFilters);
    expect(source.setFilterTree).toHaveBeenCalledWith(undefined);
    expect(order).toEqual(["extras", "tree", "host"]);
  });

  it("works without a filter tree or a host callback", () => {
    const source = { clearExtras: vi.fn() };
    clearChromeFilters(source);
    expect(source.clearExtras).toHaveBeenCalledTimes(1);
  });
});

describe("selectionObserverIds", () => {
  it("stays quiet for a controlled selection or no selection", () => {
    expect(selectionObserverIds(true, new Set(["a"]))).toBeUndefined();
    expect(selectionObserverIds(false, undefined)).toBeUndefined();
  });

  it("hands an uncontrolled observer the ids as a fresh array", () => {
    const ids = new Set(["a", "b"]);
    expect(selectionObserverIds(false, ids)).toEqual(["a", "b"]);
    expect(selectionObserverIds(false, new Set())).toEqual([]);
  });
});

describe("rowReorderEnablement", () => {
  const state = { lifted: null };

  it("is off when nothing was published", () => {
    const isHidden = vi.fn(() => false);
    expect(rowReorderEnablement(undefined, isHidden)).toEqual({
      hasRowReorder: false,
      rowReorder: undefined,
    });
    expect(isHidden).not.toHaveBeenCalled();
  });

  it("renders the state while the reorder column is visible", () => {
    const isHidden = vi.fn(() => false);
    const result = rowReorderEnablement(state, isHidden);
    expect(result).toEqual({ hasRowReorder: true, rowReorder: state });
    expect(isHidden).toHaveBeenCalledWith(REORDER_COLUMN_KEY);
  });

  it("stays composed but renders nothing once the column is hidden", () => {
    expect(rowReorderEnablement(state, () => true)).toEqual({
      hasRowReorder: true,
      rowReorder: undefined,
    });
  });
});

describe("groupingPanelState", () => {
  const interactions = {
    announcement: "",
    add: vi.fn(),
    remove: vi.fn(),
  } as unknown as GroupingPanelInteractions;
  const columns: ColumnMetadata<Row>[] = [
    { key: "id", header: "Id" },
    {
      key: "amount",
      header: "Amount",
      aggregatable: { operations: ["sum", "avg"] },
    },
  ];

  it("is undefined without panel interactions", () => {
    expect(
      groupingPanelState<Row>({
        interactions: undefined,
        groupBy: ["id"],
        columns,
        source: {},
      })
    ).toBeUndefined();
  });

  it("builds the state from this render's choices over a client source", () => {
    const setGroupAggregateOverrides = vi.fn();
    const state = groupingPanelState<Row>({
      interactions,
      groupBy: ["id"],
      columns,
      source: {
        allFilteredRows: [],
        groupAggregateOverrides: { amount: "avg" },
        setGroupAggregateOverrides,
      },
    });
    expect(state?.announcement).toBe("");
    expect(state?.add).toBe(interactions.add);
    expect(state?.groupBy).toEqual(["id"]);
    expect(state?.aggregateOverrides).toEqual({ amount: "avg" });
    expect(state?.canSetAggregates).toBe(true);
    expect(
      state?.aggregations.candidates.map((candidate) => ({
        key: candidate.columnKey,
        ops: candidate.operations.map((operation) => operation.id),
      }))
    ).toEqual([{ key: "amount", ops: ["sum", "avg"] }]);
  });

  it("defaults the overrides and cannot set aggregates without a setter", () => {
    const state = groupingPanelState<Row>({
      interactions,
      groupBy: [],
      columns,
      source: { allFilteredRows: [] },
    });
    expect(state?.aggregateOverrides).toEqual({});
    expect(state?.canSetAggregates).toBe(false);
  });

  it("lets a server source set aggregates only when it honours them", () => {
    const serverSource = {
      groups: [],
      setGroupAggregateOverrides: vi.fn(),
      aggregateOperations: ["sum"],
    };
    const honoured = groupingPanelState<Row>({
      interactions,
      groupBy: ["id"],
      columns,
      source: { ...serverSource, honorsAggregates: true },
    });
    expect(honoured?.canSetAggregates).toBe(true);
    expect(
      honoured?.aggregations.candidates[0]?.operations.map(
        (operation) => operation.id
      )
    ).toEqual(["sum"]);

    const silent = groupingPanelState<Row>({
      interactions,
      groupBy: ["id"],
      columns,
      source: serverSource,
    });
    expect(silent?.canSetAggregates).toBe(false);

    // A server that refuses aggregates offers no operation at all.
    const refused = groupingPanelState<Row>({
      interactions,
      groupBy: ["id"],
      columns,
      source: { ...serverSource, honorsAggregates: false },
    });
    expect(refused?.canSetAggregates).toBe(false);
    expect(refused?.aggregations.candidates).toEqual([]);
  });
});

describe("chromeFeatureNotices", () => {
  const base: ChromeFeatureNoticesInput<Row> = {
    options: {},
    source: { paginationMode: "paged", allFilteredRows: [], total: 0 },
    groupByKeys: [],
    rowReorderRequested: false,
    nestedArmed: false,
    hasEditableColumn: false,
    labels: defaultLabels,
  };

  it("raises nothing for a plain table", () => {
    expect(chromeFeatureNotices(base)).toEqual([]);
  });

  it("forwards the options and source into the notices", () => {
    const kinds = chromeFeatureNotices<Row>({
      ...base,
      options: { virtualize: true },
      source: { paginationMode: "paged", total: 0 },
      groupByKeys: ["id"],
      hasEditableColumn: true,
    }).map((notice) => notice.kind);
    expect(kinds).toEqual([
      "virtualize-paged",
      "grouping-unavailable",
      "edit-without-writer",
    ]);
  });

  it("treats either pinned-row option as a pinning request", () => {
    const withIds = chromeFeatureNotices({
      ...base,
      nestedArmed: true,
      options: { pinnedRowIds: { top: ["a"] } },
    });
    expect(withIds.map((notice) => notice.kind)).toEqual(["pin-nested"]);
    const withHandler = chromeFeatureNotices({
      ...base,
      nestedArmed: true,
      options: { onPinnedRowIdsChange: () => undefined },
    });
    expect(withHandler.map((notice) => notice.kind)).toEqual(["pin-nested"]);
    expect(chromeFeatureNotices({ ...base, nestedArmed: true })).toEqual([]);
  });

  it("does not flag an edit option whose writer is wired", () => {
    expect(
      chromeFeatureNotices({
        ...base,
        hasEditableColumn: true,
        options: {
          onCellEdit: () => undefined,
          rowEditing: true,
          onRowEdit: () => undefined,
          batchEditing: true,
          onBatchEdit: () => undefined,
        },
      })
    ).toEqual([]);
  });
});

describe("featureNoticesAttribute / applyFeatureNoticesAttribute", () => {
  it("joins the kinds, or is undefined when there are none", () => {
    expect(
      featureNoticesAttribute([
        { kind: "virtualize-paged" },
        { kind: "pin-nested" },
      ])
    ).toBe("virtualize-paged pin-nested");
    expect(featureNoticesAttribute([])).toBeUndefined();
  });

  it("writes and removes the root attribute", () => {
    const root = document.createElement("div");
    applyFeatureNoticesAttribute(root, [{ kind: "pin-nested" }]);
    expect(root.getAttribute("data-adapttable-notices")).toBe("pin-nested");
    applyFeatureNoticesAttribute(root, []);
    expect(root.hasAttribute("data-adapttable-notices")).toBe(false);
  });

  it("does nothing without a root", () => {
    expect(() => {
      applyFeatureNoticesAttribute(null, [{ kind: "pin-nested" }]);
    }).not.toThrow();
  });
});

describe("FilterTriggerToggleState", () => {
  it("toggles on a plain click", () => {
    const toggle = new FilterTriggerToggleState();
    expect(toggle.click(false)).toBe(true);
    toggle.pointerDown(false);
    expect(toggle.click(true)).toBe(true);
  });

  it("swallows the click when the kit closed the overlay on pointer-down", () => {
    const toggle = new FilterTriggerToggleState();
    toggle.pointerDown(true);
    expect(toggle.click(false)).toBe(false);
    // The memory resets: the next click toggles again.
    expect(toggle.click(false)).toBe(true);
  });

  it("toggles closed when the overlay is still open at click", () => {
    const toggle = new FilterTriggerToggleState();
    toggle.pointerDown(true);
    expect(toggle.click(true)).toBe(true);
  });
});

describe("scrollResetKeys", () => {
  it("includes the page only when paged", () => {
    expect(
      scrollResetKeys(
        {
          search: "ada",
          sortBy: "name",
          sortDir: "desc",
          paginationMode: "paged",
          page: 3,
        },
        2
      )
    ).toEqual(["ada", "name", "desc", 3, 2]);
    expect(
      scrollResetKeys(
        {
          search: "",
          sortBy: undefined,
          sortDir: undefined,
          paginationMode: "infinite",
          page: 7,
        },
        0
      )
    ).toEqual(["", "", "", 0, 0]);
  });
});

describe("cardSetSize", () => {
  it("is the larger of the total and the loaded window", () => {
    expect(cardSetSize({ total: 100, rows: [1, 2] }, 20)).toBe(100);
    expect(cardSetSize({ total: 0, rows: [1, 2, 3] }, 20)).toBe(23);
  });
});

describe("sortedColumnName", () => {
  const columns = [
    { key: "name", header: "Name" },
    { key: "icon", header: { node: true } },
  ];

  it("speaks the string header, else the key", () => {
    expect(sortedColumnName(columns, "name")).toBe("Name");
    expect(sortedColumnName(columns, "icon")).toBe("icon");
  });

  it("is undefined when nothing is sorted or the key is unknown", () => {
    expect(sortedColumnName(columns, undefined)).toBeUndefined();
    expect(sortedColumnName(columns, "missing")).toBeUndefined();
  });
});
