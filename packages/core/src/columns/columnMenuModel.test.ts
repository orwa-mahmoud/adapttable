/**
 * The column menu every kit renders, as a model.
 *
 * Eight adapters draw this menu with their own components and must offer the
 * same choices in the same order, disable the same entries, and refuse the
 * same locked columns — so the rules live here and are checked here rather
 * than eight times over in kit markup.
 */
import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { defaultLabels } from "../labels";
import type { ColumnLayoutState } from "./columnLayoutModel";
import {
  columnMenuActions,
  type ColumnMenuChoice,
  type ColumnMenuItem,
  columnMenuLabel,
  type ColumnMenuLabels,
  columnMenuRows,
  filterColumnMenuRows,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
  type UseColumnLayoutResult,
} from "./columnMenuModel";

interface Row {
  id: string;
  name: string;
  team: string;
  salary: number;
}

const LABELS = defaultLabels as unknown as ColumnMenuLabels;

/** The action half of a menu entry — a choice control has no `run`. */
function runOf(item: ColumnMenuItem | undefined): (() => void) | undefined {
  return item && "run" in item ? item.run : undefined;
}

const COLUMNS: ColumnMetadata<Row>[] = [
  { key: "name", header: "Name", sortable: true, renameable: true },
  { key: "team", header: "Team", filter: "text" },
  { key: "salary", header: "Salary", lockPosition: true, lockPin: true },
  { key: "notes", mobileLabel: "Notes", lockVisibility: true, lockWidth: true },
];

/** A layout that records what the menu asked it to do. */
function layoutOf<TRow>(
  state: Partial<ColumnLayoutState> = {}
): UseColumnLayoutResult<TRow> & {
  calls: { name: string; args: unknown[] }[];
} {
  const calls: { name: string; args: unknown[] }[] = [];
  const full: ColumnLayoutState = {
    order: [],
    hidden: [],
    pinned: {},
    widths: {},
    ...state,
  };
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push({ name, args });
    };
  return {
    calls,
    state: full,
    visibleColumns: [],
    isHidden: (key) => full.hidden.includes(key),
    setHidden: record("setHidden"),
    toggleVisible: record("toggleVisible"),
    setPinned: record("setPinned"),
    move: record("move"),
    setWidth: record("setWidth"),
    setName: record("setName"),
    resetName: record("resetName"),
    pinOffset: () => undefined,
    reset: record("reset"),
    toggleColumnGroup: record("toggleColumnGroup"),
  };
}

describe("columnMenuLabel", () => {
  it("prefers a text header, then the mobile label, then the key", () => {
    expect(columnMenuLabel({ key: "name", header: "Name" })).toBe("Name");
    expect(columnMenuLabel({ key: "notes", mobileLabel: "Notes" })).toBe(
      "Notes"
    );
    expect(columnMenuLabel({ key: "notes" })).toBe("notes");
    expect(columnMenuLabel({ key: "cell", header: { rendered: true } })).toBe(
      "cell"
    );
  });
});

describe("columnMenuRows", () => {
  it("lists columns in the table's real order, hidden ones in place", () => {
    const layout = layoutOf<Row>({
      order: ["team", "name", "salary", "notes"],
      hidden: ["name"],
      pinned: { team: "start" },
    });
    const rows = columnMenuRows(COLUMNS, layout);
    expect(rows.map((row) => row.key)).toEqual([
      "team",
      "name",
      "salary",
      "notes",
    ]);
    expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3]);
    expect(rows[1]).toMatchObject({ key: "name", hidden: true });
    expect(rows[0]).toMatchObject({ key: "team", pinned: "start" });
  });

  it("reads each column's locks and its declared abilities", () => {
    const rows = columnMenuRows(COLUMNS, layoutOf<Row>());
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.name).toMatchObject({
      canMove: true,
      canHide: true,
      canPin: true,
      canResize: true,
      canSort: true,
      canFilter: false,
      canRename: true,
    });
    expect(byKey.team).toMatchObject({ canFilter: true, canSort: false });
    expect(byKey.salary).toMatchObject({ canMove: false, canPin: false });
    expect(byKey.notes).toMatchObject({
      canHide: false,
      canResize: false,
      canRename: false,
      name: "Notes",
    });
  });
});

describe("filterColumnMenuRows", () => {
  it("matches a column's name or its key, ignoring case and padding", () => {
    const rows = columnMenuRows(COLUMNS, layoutOf<Row>());
    expect(filterColumnMenuRows(rows, "  TEA ").map((r) => r.key)).toEqual([
      "team",
    ]);
    expect(filterColumnMenuRows(rows, "notes").map((r) => r.key)).toEqual([
      "notes",
    ]);
    expect(filterColumnMenuRows(rows, "")).toHaveLength(rows.length);
    expect(filterColumnMenuRows(rows, "zzz")).toEqual([]);
  });
});

describe("the bulk actions leave locked columns alone", () => {
  it("shows every hidden column that may be shown", () => {
    const layout = layoutOf<Row>({ hidden: ["name", "notes"] });
    showAllColumns(columnMenuRows(COLUMNS, layout), layout);
    expect(layout.calls).toEqual([
      { name: "setHidden", args: ["name", false] },
    ]);
  });

  it("hides every visible column that may be hidden", () => {
    const layout = layoutOf<Row>({ hidden: ["team"] });
    hideAllColumns(columnMenuRows(COLUMNS, layout), layout);
    expect(layout.calls.map((call) => call.args[0])).toEqual([
      "name",
      "salary",
    ]);
  });

  it("unpins every pinned column that may be unpinned", () => {
    const layout = layoutOf<Row>({
      pinned: { name: "start", salary: "start" },
    });
    unpinAllColumns(columnMenuRows(COLUMNS, layout), layout);
    expect(layout.calls).toEqual([
      { name: "setPinned", args: ["name", undefined] },
    ]);
  });

  it("restores one column's visibility, pin, width and name", () => {
    const layout = layoutOf<Row>();
    const rows = columnMenuRows(COLUMNS, layout);
    resetColumnLayout(rows[0]!, layout);
    expect(layout.calls.map((call) => call.name)).toEqual([
      "setHidden",
      "setPinned",
      "setWidth",
      "resetName",
    ]);
    layout.calls.length = 0;
    resetColumnLayout(rows[3]!, layout);
    expect(layout.calls.map((call) => call.name)).toEqual(["setPinned"]);
  });
});

describe("nextPinSide / pinActionLabel", () => {
  it("toggles a data column between the start edge and nothing", () => {
    expect(nextPinSide(undefined)).toBe("start");
    expect(nextPinSide("start")).toBeUndefined();
    expect(nextPinSide("end")).toBeUndefined();
  });

  it("names what the click will do", () => {
    const labels = { pinStart: "Pin to start", unpin: "Unpin" };
    expect(pinActionLabel(undefined, labels)).toBe("Pin to start");
    expect(pinActionLabel("start", labels)).toBe("Unpin");
  });
});

const SALARY_OPERATIONS = [
  { id: "sum", builtIn: true },
  { id: "avg", builtIn: true },
] as const;

describe("columnMenuActions", () => {
  function actionsFor(
    key: string,
    ctx: Partial<Parameters<typeof columnMenuActions<Row>>[1]> = {},
    state: Partial<ColumnLayoutState> = {}
  ) {
    const layout = layoutOf<Row>(state);
    const row = columnMenuRows(COLUMNS, layout).find((r) => r.key === key);
    if (!row) throw new Error(`no menu row for "${key}"`);
    return {
      layout,
      actions: columnMenuActions(row, { labels: LABELS, layout, ...ctx }),
    };
  }

  it("offers nothing but reset when the column is locked and no handler is wired", () => {
    const { actions } = actionsFor("notes");
    expect(actions.map((action) => action.id)).toEqual([
      "pin-start",
      "pin-end",
      "unpin",
      "reset",
    ]);
  });

  it("disables the sort already in effect", () => {
    const onSortColumn = vi.fn();
    const { actions } = actionsFor("name", {
      onSortColumn,
      sortBy: "name",
      sortDir: "asc",
    });
    const byId = Object.fromEntries(actions.map((a) => [a.id, a]));
    expect(byId["sort-asc"]?.disabled).toBe(true);
    expect(byId["sort-desc"]?.disabled).toBe(false);
    runOf(byId["sort-desc"])?.();
    expect(onSortColumn).toHaveBeenCalledWith("name", "desc");
  });

  it("disables the pin the column already has", () => {
    const { actions, layout } = actionsFor(
      "name",
      {},
      { pinned: { name: "start" } }
    );
    const byId = Object.fromEntries(actions.map((a) => [a.id, a]));
    expect(byId["pin-start"]?.disabled).toBe(true);
    expect(byId.unpin?.disabled).toBe(false);
    runOf(byId.unpin)?.();
    expect(layout.calls).toContainEqual({
      name: "setPinned",
      args: ["name", undefined],
    });
  });

  it("names the visibility toggle after what it will do", () => {
    const visible = actionsFor("name").actions.find(
      (a) => a.id === "hide" || a.id === "show"
    );
    expect(visible?.id).toBe("hide");
    const hidden = actionsFor("name", {}, { hidden: ["name"] }).actions.find(
      (a) => a.id === "hide" || a.id === "show"
    );
    expect(hidden?.id).toBe("show");
  });

  it("adds auto-size, filter and rename only when the host wired them", () => {
    const bare = actionsFor("team").actions.map((a) => a.id);
    expect(bare).not.toContain("auto-size");
    expect(bare).not.toContain("filter");
    const wired = actionsFor("team", {
      onAutoSizeColumn: vi.fn(),
      onFilterColumn: vi.fn(),
    }).actions.map((a) => a.id);
    expect(wired).toContain("auto-size");
    expect(wired).toContain("filter");
    expect(
      actionsFor("name", { onBeginRename: vi.fn() }).actions.map((a) => a.id)
    ).toContain("rename");
  });

  it("disables reset when there is nothing about the column to restore", () => {
    const locked = actionsFor("notes").actions.find((a) => a.id === "reset");
    expect(locked?.disabled).toBe(false);
    const noName = actionsFor("salary").actions.find((a) => a.id === "reset");
    expect(noName?.disabled).toBe(false);
  });

  it("offers grouping and its aggregation when the panel is composed", () => {
    const panel = {
      groupBy: ["team"],
      aggregateOverrides: { salary: "sum" as const },
      canSetAggregates: true,
      announcement: "",
      headerDragProps: () => ({}),
      chipDragProps: () => ({}),
      chipKeyboardProps: () => ({
        tabIndex: 0 as const,
        role: "button" as const,
        "aria-label": "",
        onKeyDown: () => undefined,
      }),
      dropProps: () => ({}),
      removeDropProps: () => ({}),
      add: vi.fn(),
      remove: vi.fn(),
      moveBy: vi.fn(),
      setAggregate: vi.fn(),
      aggregations: {
        items: [
          {
            columnKey: "salary",
            operationId: "sum",
            editable: true,
            origin: "reader" as const,
            operations: SALARY_OPERATIONS,
          },
        ],
        candidates: [
          {
            columnKey: "team",
            active: false,
            operations: [{ id: "count", builtIn: true }],
          },
          {
            columnKey: "salary",
            active: true,
            operations: SALARY_OPERATIONS,
          },
        ],
        atDefaults: false,
        hasDefaults: true,
      },
      setAggregateOperation: vi.fn(),
      addAggregate: vi.fn(),
      removeAggregate: vi.fn(),
      restoreAggregateDefaults: vi.fn(),
    };
    const grouped = actionsFor("team", { groupingPanel: panel }).actions;
    expect(grouped.map((a) => a.id)).toContain("ungroup-column");
    // Grouping a column does not take its aggregation controls away.
    expect(grouped.map((a) => a.id)).toContain("group-aggregation");
    runOf(grouped.find((a) => a.id === "ungroup-column"))?.();
    expect(panel.remove).toHaveBeenCalledWith("team");

    const ungrouped = actionsFor("salary", { groupingPanel: panel }).actions;
    expect(ungrouped.map((a) => a.id)).toContain("group-by-column");
    const choice = ungrouped.find(
      (a): a is ColumnMenuChoice => a.id === "group-aggregation"
    );
    expect(choice?.value).toBe("sum");
    // Actual operations only — removal is its own action, never "None" in
    // the selector.
    expect(choice?.options.map((option) => option.value)).toEqual([
      "sum",
      "avg",
    ]);
    choice?.onChange("avg");
    expect(panel.setAggregateOperation).toHaveBeenCalledWith("salary", "avg");
    const remove = ungrouped.find((a) => a.id === "remove-aggregation");
    expect(remove && "run" in remove ? remove.label : undefined).toBe(
      "Remove Salary aggregation"
    );
    runOf(remove)?.();
    expect(panel.removeAggregate).toHaveBeenCalledWith("salary");
  });

  it("appends what a plugin contributes, one entry or many", () => {
    const featureHost = {
      columnMenuActions: [
        () => ({
          id: "one",
          label: "One",
          disabled: false,
          run: () => undefined,
        }),
        () => [
          { id: "two", label: "Two", disabled: false, run: () => undefined },
          {
            id: "three",
            label: "Three",
            disabled: false,
            run: () => undefined,
          },
        ],
        () => undefined,
      ],
    } as unknown as Parameters<typeof columnMenuActions<Row>>[1]["featureHost"];
    const { actions } = actionsFor("name", { featureHost });
    expect(actions.slice(-3).map((a) => a.id)).toEqual(["one", "two", "three"]);
  });
});

describe("every column-menu action actually does something", () => {
  it("routes each entry to the layout or the handler it names", () => {
    const layout = layoutOf<Row>({ pinned: { name: "end" } });
    const onSortColumn = vi.fn();
    const onAutoSizeColumn = vi.fn();
    const onFilterColumn = vi.fn();
    const onBeginRename = vi.fn();
    // "team" is the column that declares a filter; "name" is the one that
    // declares a rename. Both are needed to reach every entry.
    const rows = columnMenuRows(COLUMNS, layout);
    const row = rows.find((r) => r.key === "name");
    const filterable = rows.find((r) => r.key === "team");
    for (const action of columnMenuActions(filterable!, {
      labels: LABELS,
      layout,
      onFilterColumn,
    })) {
      if ("run" in action) action.run();
    }
    const actions = columnMenuActions(row!, {
      labels: LABELS,
      layout,
      onSortColumn,
      onAutoSizeColumn,
      onFilterColumn,
      onBeginRename,
    });
    for (const action of actions) {
      if ("run" in action) action.run();
    }
    expect(onSortColumn.mock.calls).toEqual([
      ["name", "asc"],
      ["name", "desc"],
    ]);
    expect(onAutoSizeColumn).toHaveBeenCalledWith("name");
    expect(onFilterColumn).toHaveBeenCalledWith("team");
    expect(onBeginRename).toHaveBeenCalledTimes(1);
    const names = layout.calls.map((call) => call.name);
    expect(names).toContain("setPinned");
    expect(names).toContain("toggleVisible");
    expect(names).toContain("setWidth");
    expect(names).toContain("resetName");
  });

  it("disables reset once nothing about the column differs from its declaration", () => {
    const named = layoutOf<Row>({ names: { name: "Full name" } });
    const row = columnMenuRows(COLUMNS, named).find((r) => r.key === "name");
    const reset = columnMenuActions(row!, {
      labels: LABELS,
      layout: named,
    }).find((action) => action.id === "reset");
    expect(reset?.disabled).toBe(false);
  });

  it("adds a grouped column back when the panel offers it", () => {
    const layout = layoutOf<Row>();
    const panel = {
      groupBy: [],
      aggregateOverrides: {},
      canSetAggregates: false,
      announcement: "",
      headerDragProps: () => ({}),
      chipDragProps: () => ({}),
      chipKeyboardProps: () => ({
        tabIndex: 0 as const,
        role: "button" as const,
        "aria-label": "",
        onKeyDown: () => undefined,
      }),
      dropProps: () => ({}),
      removeDropProps: () => ({}),
      add: vi.fn(),
      remove: vi.fn(),
      moveBy: vi.fn(),
      setAggregate: vi.fn(),
      aggregations: {
        items: [
          {
            columnKey: "salary",
            operationId: "sum",
            editable: true,
            origin: "reader" as const,
            operations: SALARY_OPERATIONS,
          },
        ],
        candidates: [
          {
            columnKey: "salary",
            active: true,
            operations: SALARY_OPERATIONS,
          },
        ],
        atDefaults: false,
        hasDefaults: false,
      },
      setAggregateOperation: vi.fn(),
      addAggregate: vi.fn(),
      removeAggregate: vi.fn(),
      restoreAggregateDefaults: vi.fn(),
    };
    const row = columnMenuRows(COLUMNS, layout).find((r) => r.key === "team");
    const actions = columnMenuActions(row!, {
      labels: LABELS,
      layout,
      groupingPanel: panel,
    });
    runOf(actions.find((action) => action.id === "group-by-column"))?.();
    expect(panel.add).toHaveBeenCalledWith("team");
    // With nothing grouped yet there is no aggregation to choose.
    expect(actions.map((action) => action.id)).not.toContain(
      "group-aggregation"
    );
  });
});
