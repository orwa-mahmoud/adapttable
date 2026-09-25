import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  type ColumnLayoutState,
  edgePinStyle,
  EMPTY_COLUMN_LAYOUT,
  PIN_Z,
  pinnedCellStyle,
  useColumnLayout,
} from "./useColumnLayout";

interface Row {
  id: string;
}
const columns: ColumnDef<Row>[] = [
  { key: "a", header: "A", accessor: (r) => r.id },
  { key: "b", header: "B", accessor: (r) => r.id },
  { key: "c", header: "C", accessor: (r) => r.id },
];
const keys = (cols: ColumnDef<Row>[]) => cols.map((c) => c.key);

function renameableColumn(header: string, key = "a"): ColumnDef<Row> {
  return {
    key,
    header,
    accessor: (row) => row.id,
    renameable: true,
  };
}

describe("useColumnLayout", () => {
  it("returns all columns in declared order by default", () => {
    const { result } = renderHook(() => useColumnLayout({ columns }));
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);
  });

  it("refuses a move that would split a married column group", () => {
    // `marryChildren` means the group's columns travel together. Dropping an
    // outsider between them is not a layout the reader can be shown, so the
    // move is declined rather than half-applied.
    const married = new Map([
      [
        "People",
        {
          id: "People",
          childKeys: ["a", "b"],
          marryChildren: true,
        },
      ],
    ]) as never;
    const { result } = renderHook(() =>
      useColumnLayout({ columns, columnGroups: married })
    );

    act(() => result.current.move("c", 1));
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);

    // A move that keeps them adjacent still goes through.
    act(() => result.current.move("c", 0));
    expect(keys(result.current.visibleColumns)).toEqual(["c", "a", "b"]);
  });

  it("hides and shows a column (uncontrolled)", () => {
    const { result } = renderHook(() => useColumnLayout({ columns }));
    act(() => result.current.toggleVisible("b"));
    expect(keys(result.current.visibleColumns)).toEqual(["a", "c"]);
    expect(result.current.isHidden("b")).toBe(true);
    act(() => result.current.setHidden("b", false));
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);
  });

  it("applies an explicit order, appending unlisted columns", () => {
    const { result } = renderHook(() =>
      useColumnLayout({
        columns,
        defaultColumnLayout: { order: ["c", "a"] },
      })
    );
    expect(keys(result.current.visibleColumns)).toEqual(["c", "a", "b"]);
  });

  it("reset restores all columns and declared order", () => {
    const { result } = renderHook(() =>
      useColumnLayout({ columns, defaultColumnLayout: { hidden: ["a"] } })
    );
    expect(keys(result.current.visibleColumns)).toEqual(["b", "c"]);
    act(() => result.current.reset());
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);
  });

  it("is controlled: mutations call onLayoutChange and do not self-update", () => {
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnLayout({
        columns,
        layout: { hidden: [], order: [], pinned: {}, widths: {} },
        onLayoutChange,
      })
    );
    act(() => result.current.toggleVisible("a"));
    expect(onLayoutChange).toHaveBeenCalledWith(
      expect.objectContaining({ hidden: ["a"] })
    );
    // Controlled value didn't change, so the rendered columns are unchanged
    // until the parent passes a new `layout`.
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);
  });

  it("ignores an unknown key in the order", () => {
    const { result } = renderHook(() =>
      useColumnLayout({ columns, defaultColumnLayout: { order: ["zzz", "b"] } })
    );
    expect(keys(result.current.visibleColumns)).toEqual(["b", "a", "c"]);
  });

  it("moves a column to a new index", () => {
    const { result } = renderHook(() => useColumnLayout({ columns }));
    act(() => result.current.move("a", 2));
    expect(keys(result.current.visibleColumns)).toEqual(["b", "c", "a"]);
  });

  it("pins columns and computes sticky offsets from widths", () => {
    const { result } = renderHook(() =>
      useColumnLayout({
        columns,
        defaultColumnLayout: { widths: { a: 100, b: 120 } },
      })
    );
    act(() => result.current.setPinned("a", "start"));
    act(() => result.current.setPinned("b", "start"));
    // 'a' is first left-pinned → inset 0; 'b' follows → inset = width(a) = 100.
    expect(result.current.pinOffset("a")).toEqual({ side: "start", inset: 0 });
    expect(result.current.pinOffset("b")).toEqual({
      side: "start",
      inset: 100,
    });
    expect(result.current.pinOffset("c")).toBeUndefined();
    act(() => result.current.setPinned("a", undefined));
    expect(result.current.pinOffset("a")).toBeUndefined();
  });

  it("right-pin offset sums widths of right-pinned columns after it", () => {
    const { result } = renderHook(() =>
      useColumnLayout({
        columns,
        defaultColumnLayout: {
          pinned: { b: "end", c: "end" },
          widths: { c: 80 },
        },
      })
    );
    // 'b' is before 'c' (both right-pinned) → inset = width(c) = 80.
    expect(result.current.pinOffset("b")).toEqual({ side: "end", inset: 80 });
    expect(result.current.pinOffset("c")).toEqual({ side: "end", inset: 0 });
  });

  it("resolves declared string widths (parseInt) and the 150 fallback", () => {
    // No state widths: 'a' has a string declared width "120px" (parsed to 120),
    // 'b' has none at all (falls back to 150). 'c' is pinned last and follows
    // both, so its inset sums width(a) + width(b) = 120 + 150 = 270.
    const widthCols: ColumnDef<Row>[] = [
      { key: "a", header: "A", accessor: (r) => r.id, width: "120px" },
      { key: "b", header: "B", accessor: (r) => r.id },
      { key: "c", header: "C", accessor: (r) => r.id },
    ];
    const { result } = renderHook(() =>
      useColumnLayout({
        columns: widthCols,
        defaultColumnLayout: {
          pinned: { a: "start", b: "start", c: "start" },
        },
      })
    );
    expect(result.current.pinOffset("a")).toEqual({ side: "start", inset: 0 });
    expect(result.current.pinOffset("b")).toEqual({
      side: "start",
      inset: 120,
    });
    expect(result.current.pinOffset("c")).toEqual({
      side: "start",
      inset: 270,
    });
  });

  it("falls back to 150 for an unparseable declared string width", () => {
    const widthCols: ColumnDef<Row>[] = [
      { key: "a", header: "A", accessor: (r) => r.id, width: "auto" },
      { key: "b", header: "B", accessor: (r) => r.id },
    ];
    const { result } = renderHook(() =>
      useColumnLayout({
        columns: widthCols,
        defaultColumnLayout: { pinned: { a: "start", b: "start" } },
      })
    );
    // "auto" parses to NaN → fallback 150, so 'b' is inset by 150.
    expect(result.current.pinOffset("b")).toEqual({
      side: "start",
      inset: 150,
    });
  });

  it("builds a sticky style from a pin offset (or undefined when unpinned)", () => {
    // Logical insets: a "start" pin sticks to the inline START, so the same
    // style lands on the correct edge (physical right) under dir="rtl".
    expect(pinnedCellStyle(undefined)).toBeUndefined();
    expect(pinnedCellStyle({ side: "start", inset: 0 })).toEqual({
      position: "sticky",
      insetInlineStart: 0,
      zIndex: 1,
    });
    expect(pinnedCellStyle({ side: "end", inset: 80 }, 3)).toEqual({
      position: "sticky",
      insetInlineEnd: 80,
      zIndex: 3,
    });
  });

  it("offsets a pinned cell past a leading/trailing edge column via leads", () => {
    // Start pin shifts inward by the selection-column lead; the end lead is
    // ignored for a start pin (and vice-versa).
    expect(
      pinnedCellStyle({ side: "start", inset: 30 }, PIN_Z.body, {
        start: 40,
        end: 120,
      })
    ).toEqual({ position: "sticky", insetInlineStart: 70, zIndex: PIN_Z.body });
    expect(
      pinnedCellStyle({ side: "end", inset: 10 }, PIN_Z.body, { start: 40 })
    ).toEqual({ position: "sticky", insetInlineEnd: 10, zIndex: PIN_Z.body });
  });

  it("builds an edge-pin style only when that side is active", () => {
    expect(edgePinStyle("start", false)).toBeUndefined();
    expect(edgePinStyle("start", true)).toEqual({
      position: "sticky",
      insetInlineStart: 0,
      zIndex: PIN_Z.body,
    });
    expect(edgePinStyle("end", true, PIN_Z.headerPinned)).toEqual({
      position: "sticky",
      insetInlineEnd: 0,
      zIndex: PIN_Z.headerPinned,
    });
  });

  it("reports a pinned-but-hidden column as unpinned (no garbage inset)", () => {
    const { result } = renderHook(() =>
      useColumnLayout({
        columns,
        defaultColumnLayout: {
          hidden: ["a"],
          pinned: { a: "start", b: "start" },
          widths: { a: 100, b: 90 },
        },
      })
    );
    // 'a' is pinned but hidden → no rendered cell to stick.
    expect(result.current.pinOffset("a")).toBeUndefined();
    // 'b' is the only VISIBLE left-pinned column → inset 0, not width(a).
    expect(result.current.pinOffset("b")).toEqual({ side: "start", inset: 0 });
  });

  it("sets and clears a column width", () => {
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnLayout({ columns, onLayoutChange })
    );
    act(() => result.current.setWidth("a", 200));
    expect(result.current.state.widths.a).toBe(200);
    act(() => result.current.setWidth("a", undefined));
    expect(result.current.state.widths.a).toBeUndefined();
  });

  it("renames an opted-in column without changing its stable key", () => {
    const onColumnRename = vi.fn();
    const renameable: ColumnDef<Row>[] = [
      {
        key: "a",
        header: "Alpha",
        mobileLabel: "Short alpha",
        accessor: (row) => row.id,
        renameable: true,
      },
    ];
    const { result } = renderHook(() =>
      useColumnLayout({ columns: renameable, onColumnRename })
    );

    act(() => result.current.setName("a", "  Account owner  "));

    expect(result.current.state.names).toEqual({ a: "Account owner" });
    expect(result.current.visibleColumns[0]).toMatchObject({
      key: "a",
      header: "Account owner",
      mobileLabel: "Account owner",
    });
    expect(onColumnRename).toHaveBeenCalledWith("a", "Account owner");
  });

  it("reports a controlled rename through both layout and domain channels", () => {
    const onLayoutChange = vi.fn();
    const onColumnRename = vi.fn();
    const renameable = [{ ...columns[0]!, renameable: true }];
    const { result } = renderHook(() =>
      useColumnLayout({
        columns: renameable,
        layout: EMPTY_COLUMN_LAYOUT,
        onLayoutChange,
        onColumnRename,
      })
    );

    act(() => result.current.setName("a", "Owner"));
    expect(onLayoutChange).toHaveBeenCalledWith({
      ...EMPTY_COLUMN_LAYOUT,
      names: { a: "Owner" },
    });
    expect(onColumnRename).toHaveBeenCalledWith("a", "Owner");
    // Controlled state changes only when the host passes the next value back.
    expect(result.current.state.names).toBeUndefined();
  });

  it("requires both renameable and the host callback, and rejects blank names", () => {
    const onColumnRename = vi.fn();
    const renameable = [{ ...columns[0]!, renameable: true }];
    const withoutCallback = renderHook(() =>
      useColumnLayout({ columns: renameable })
    );
    act(() => withoutCallback.result.current.setName("a", "Changed"));
    expect(withoutCallback.result.current.state.names).toBeUndefined();

    const locked = renderHook(() =>
      useColumnLayout({ columns, onColumnRename })
    );
    act(() => locked.result.current.setName("a", "Changed"));
    expect(locked.result.current.state.names).toBeUndefined();

    const blank = renderHook(() =>
      useColumnLayout({ columns: renameable, onColumnRename })
    );
    act(() => blank.result.current.setName("a", "   "));
    expect(blank.result.current.state.names).toBeUndefined();
    expect(onColumnRename).not.toHaveBeenCalled();

    const idle = renderHook(() =>
      useColumnLayout({ columns: renameable, onColumnRename })
    );
    act(() => idle.result.current.resetName("a"));
    expect(idle.result.current.state.names).toBeUndefined();
    expect(onColumnRename).toHaveBeenCalledTimes(0);
  });

  it("clears an override when the typed name matches the declaration", () => {
    const onColumnRename = vi.fn();
    const { result } = renderHook(() =>
      useColumnLayout({
        columns: [renameableColumn("Alpha")],
        onColumnRename,
      })
    );
    act(() => result.current.setName("a", "Owner"));
    expect(result.current.state.names).toEqual({ a: "Owner" });
    act(() => result.current.setName("a", "Alpha"));
    expect(result.current.state.names).toBeUndefined();
    expect(onColumnRename).toHaveBeenLastCalledWith("a", "Alpha");
  });

  it("hydrates stored names only for columns that opted into renaming", () => {
    const renameable = [{ ...columns[0]!, renameable: true }];
    const enabled = renderHook(() =>
      useColumnLayout({
        columns: renameable,
        defaultColumnLayout: { names: { a: "Stored name" } },
      })
    );
    expect(enabled.result.current.visibleColumns[0]!.header).toBe(
      "Stored name"
    );

    const disabled = renderHook(() =>
      useColumnLayout({
        columns,
        defaultColumnLayout: { names: { a: "Untrusted name" } },
      })
    );
    expect(disabled.result.current.visibleColumns[0]!.header).toBe("A");
  });

  it("restores the declared name through per-column and full reset", () => {
    const onColumnRename = vi.fn();
    const renameable = [{ ...columns[0]!, header: "Alpha", renameable: true }];
    const { result, rerender } = renderHook(
      ({ currentColumns }: { currentColumns: ColumnDef<Row>[] }) =>
        useColumnLayout({ columns: currentColumns, onColumnRename }),
      { initialProps: { currentColumns: renameable } }
    );

    act(() => result.current.setName("a", "Owner"));
    rerender({
      currentColumns: [{ ...renameable[0]!, header: "Owner" }],
    });
    act(() => result.current.resetName("a"));
    expect(result.current.state.names).toBeUndefined();
    // The host echoed the accepted value into `columns`, but reset still
    // reports the declaration that preceded the active user override.
    expect(onColumnRename).toHaveBeenLastCalledWith("a", "Alpha");

    act(() => result.current.setName("a", "Person"));
    act(() => result.current.reset());
    expect(result.current.state).toEqual(EMPTY_COLUMN_LAYOUT);
    expect(onColumnRename).toHaveBeenLastCalledWith("a", "Alpha");
  });

  it("resumes the current declared name after reset and host reconciliation", () => {
    const onColumnRename = vi.fn();
    const { result, rerender } = renderHook(
      ({ currentColumns }: { currentColumns: ColumnDef<Row>[] }) =>
        useColumnLayout({ columns: currentColumns, onColumnRename }),
      { initialProps: { currentColumns: [renameableColumn("Alpha")] } }
    );

    act(() => result.current.setName("a", "Owner"));
    rerender({ currentColumns: [renameableColumn("Owner")] });
    // Stale echo after reset must not become the next baseline.
    act(() => result.current.resetName("a"));
    rerender({ currentColumns: [renameableColumn("Owner")] });
    rerender({ currentColumns: [renameableColumn("Alpha")] });
    rerender({ currentColumns: [renameableColumn("Title")] });

    act(() => result.current.setName("a", "Nickname"));
    act(() => result.current.resetName("a"));
    expect(onColumnRename).toHaveBeenLastCalledWith("a", "Title");
  });

  it("tracks a later declared name after a controlled reset reconciles", () => {
    const onColumnRename = vi.fn();
    const onLayoutChange = vi.fn();
    const { result, rerender } = renderHook(
      ({
        currentColumns,
        layout,
      }: {
        currentColumns: ColumnDef<Row>[];
        layout: ColumnLayoutState;
      }) =>
        useColumnLayout({
          columns: currentColumns,
          layout,
          onLayoutChange,
          onColumnRename,
        }),
      {
        initialProps: {
          currentColumns: [renameableColumn("Alpha")],
          layout: EMPTY_COLUMN_LAYOUT,
        },
      }
    );

    act(() => result.current.setName("a", "Owner"));
    const renamed = onLayoutChange.mock.calls.at(-1)![0] as ColumnLayoutState;
    rerender({
      currentColumns: [renameableColumn("Owner")],
      layout: renamed,
    });
    act(() => result.current.resetName("a"));
    const cleared = onLayoutChange.mock.calls.at(-1)![0] as ColumnLayoutState;
    rerender({
      currentColumns: [renameableColumn("Owner")],
      layout: cleared,
    });
    rerender({
      currentColumns: [renameableColumn("Alpha")],
      layout: cleared,
    });
    rerender({
      currentColumns: [renameableColumn("Title")],
      layout: cleared,
    });

    act(() => result.current.setName("a", "Nickname"));
    const renamedAgain = onLayoutChange.mock.calls.at(
      -1
    )![0] as ColumnLayoutState;
    rerender({
      currentColumns: [renameableColumn("Nickname")],
      layout: renamedAgain,
    });
    act(() => result.current.resetName("a"));
    expect(onColumnRename).toHaveBeenLastCalledWith("a", "Title");
  });

  it("resumes the live declaration when controlled names drop the override", () => {
    const onColumnRename = vi.fn();
    const onLayoutChange = vi.fn();
    const { result, rerender } = renderHook(
      ({
        currentColumns,
        layout,
      }: {
        currentColumns: ColumnDef<Row>[];
        layout: ColumnLayoutState;
      }) =>
        useColumnLayout({
          columns: currentColumns,
          layout,
          onLayoutChange,
          onColumnRename,
        }),
      {
        initialProps: {
          currentColumns: [renameableColumn("A")],
          layout: EMPTY_COLUMN_LAYOUT,
        },
      }
    );

    act(() => result.current.setName("a", "Owner"));
    rerender({
      currentColumns: [renameableColumn("A")],
      layout: { ...EMPTY_COLUMN_LAYOUT, names: { a: "Owner" } },
    });
    rerender({
      currentColumns: [renameableColumn("A")],
      layout: EMPTY_COLUMN_LAYOUT,
    });
    rerender({
      currentColumns: [renameableColumn("Beta")],
      layout: EMPTY_COLUMN_LAYOUT,
    });

    act(() => result.current.setName("a", "Nickname"));
    const renamedAgain = onLayoutChange.mock.calls.at(
      -1
    )![0] as ColumnLayoutState;
    rerender({
      currentColumns: [renameableColumn("Nickname")],
      layout: renamedAgain,
    });
    act(() => result.current.resetName("a"));
    expect(onColumnRename).toHaveBeenLastCalledWith("a", "Beta");
  });

  it("does not inherit a prior baseline when the same key is removed and re-added", () => {
    const onColumnRename = vi.fn();
    const { result, rerender } = renderHook(
      ({ currentColumns }: { currentColumns: ColumnDef<Row>[] }) =>
        useColumnLayout({ columns: currentColumns, onColumnRename }),
      { initialProps: { currentColumns: [renameableColumn("Alpha")] } }
    );

    act(() => result.current.setName("a", "Owner"));
    rerender({ currentColumns: [] });
    rerender({ currentColumns: [renameableColumn("Replacement")] });

    act(() => result.current.resetName("a"));
    expect(onColumnRename).toHaveBeenLastCalledWith("a", "Replacement");
  });

  it("resets one column without disturbing another active rename", () => {
    const onColumnRename = vi.fn();
    const pair: ColumnDef<Row>[] = [
      renameableColumn("Alpha"),
      renameableColumn("Bravo", "b"),
    ];
    const { result, rerender } = renderHook(
      ({ currentColumns }: { currentColumns: ColumnDef<Row>[] }) =>
        useColumnLayout({ columns: currentColumns, onColumnRename }),
      { initialProps: { currentColumns: pair } }
    );

    act(() => result.current.setName("a", "Owner A"));
    act(() => result.current.setName("b", "Owner B"));
    rerender({
      currentColumns: [
        { ...pair[0]!, header: "Owner A" },
        { ...pair[1]!, header: "Owner B" },
      ],
    });

    act(() => result.current.resetName("a"));
    expect(onColumnRename).toHaveBeenLastCalledWith("a", "Alpha");
    expect(result.current.state.names).toEqual({ b: "Owner B" });

    act(() => result.current.resetName("b"));
    expect(onColumnRename).toHaveBeenLastCalledWith("b", "Bravo");
    expect(result.current.state.names).toBeUndefined();
  });

  it("setHidden is a no-op when visibility already matches", () => {
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnLayout({ columns, onLayoutChange })
    );
    // 'a' is already visible; asking to show it again must not commit.
    act(() => result.current.setHidden("a", false));
    expect(onLayoutChange).not.toHaveBeenCalled();
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);
  });

  it("move ignores an unknown key (not found in the order)", () => {
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnLayout({ columns, onLayoutChange })
    );
    act(() => result.current.move("zzz", 0));
    expect(onLayoutChange).not.toHaveBeenCalled();
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);
  });

  it("move is a no-op when the target index equals the current index", () => {
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnLayout({ columns, onLayoutChange })
    );
    // 'a' is already at index 0; moving it to 0 must not commit.
    act(() => result.current.move("a", 0));
    expect(onLayoutChange).not.toHaveBeenCalled();
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);
  });

  it("resolves a declared numeric width for a pinned column", () => {
    const widthCols: ColumnDef<Row>[] = [
      { key: "a", header: "A", accessor: (r) => r.id, width: 90 },
      { key: "b", header: "B", accessor: (r) => r.id },
    ];
    const { result } = renderHook(() =>
      useColumnLayout({
        columns: widthCols,
        defaultColumnLayout: { pinned: { a: "start", b: "start" } },
      })
    );
    // No state width for 'a', but its declared numeric width (90) is used, so
    // 'b' is inset by 90.
    expect(result.current.pinOffset("b")).toEqual({ side: "start", inset: 90 });
  });
});

describe("batched mutations", () => {
  it("composes two mutations fired in one event handler", () => {
    const { result } = renderHook(() => useColumnLayout({ columns }));
    act(() => {
      // Both run before any re-render — the second must see the first.
      result.current.setPinned("a", "start");
      result.current.setWidth("a", 200);
    });
    expect(result.current.state.pinned).toEqual({ a: "start" });
    expect(result.current.state.widths).toEqual({ a: 200 });
  });

  it("hides non-summary leaves only when column-group collapse is armed", () => {
    const grouped: ColumnDef<Row>[] = [
      { key: "a", header: "A", accessor: (r) => r.id, group: "People" },
      { key: "b", header: "B", accessor: (r) => r.id, group: "People" },
      { key: "c", header: "C", accessor: (r) => r.id },
    ];
    const idle = renderHook(() => useColumnLayout({ columns: grouped }));
    act(() => idle.result.current.toggleColumnGroup("People"));
    expect(keys(idle.result.current.visibleColumns)).toEqual(["a", "b", "c"]);

    const { result } = renderHook(() =>
      useColumnLayout({ columns: grouped, collapsibleColumnGroups: true })
    );
    act(() => result.current.toggleColumnGroup("People"));
    const collapsedKeys = keys(result.current.visibleColumns);
    expect(collapsedKeys[0]).toMatch(/^__groupStub:People:/);
    expect(collapsedKeys).toEqual([collapsedKeys[0], "c"]);
    expect(result.current.state.collapsedGroups).toEqual(["People"]);
    act(() => result.current.toggleColumnGroup("People"));
    expect(keys(result.current.visibleColumns)).toEqual(["a", "b", "c"]);
    expect(result.current.state.collapsedGroups).toBeUndefined();
  });
});
