/**
 * `copyCells`, the copy route that is not the keyboard.
 *
 * Ctrl+C always has a focused range to work from. A context menu does not:
 * a right-click on a cell with nothing selected has to copy that cell, and
 * that difference is the whole reason this exists beside the key handler.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { contextMenuCopyTarget } from "./contextMenuCopy";
import { useGridFocus } from "./useGridFocus";

interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", city: "London" },
  { id: "2", name: "Grace", city: "New York" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "city", header: "City", accessor: (r) => r.city },
];

const written: string[] = [];

beforeEach(() => {
  written.length = 0;
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn((text: string) => {
        written.push(text);
        return Promise.resolve();
      }),
    },
  });
});

const setup = (enabled = true) =>
  renderHook(() =>
    useGridFocus<Row>({
      enabled,
      rowCount: ROWS.length,
      rows: ROWS,
      columns: COLUMNS,
      firstRowIndex: 0,
    })
  );

describe("copyCells", () => {
  it("copies the one cell it was given when nothing is selected", async () => {
    const { result } = setup();
    await act(async () => {
      result.current.copyCells({ row: 1, col: 1 });
      await Promise.resolve();
    });

    expect(written).toEqual(["New York"]);
  });

  it("copies the whole selection when it is given no cell", async () => {
    const { result } = setup();
    act(() => {
      result.current.selectRange({
        anchor: { row: 0, col: 0 },
        head: { row: 1, col: 1 },
      });
    });
    await act(async () => {
      result.current.copyCells();
      await Promise.resolve();
    });

    expect(written[0]).toContain("Ada\tLondon");
    expect(written[0]).toContain("Grace\tNew York");
  });

  it("prefers the cell it was given over whatever is selected", async () => {
    const { result } = setup();
    act(() => {
      result.current.selectRange({
        anchor: { row: 0, col: 0 },
        head: { row: 1, col: 1 },
      });
    });
    await act(async () => {
      result.current.copyCells({ row: 0, col: 0 });
      await Promise.resolve();
    });

    expect(written).toEqual(["Ada"]);
  });

  it("does nothing when there is neither a cell nor a selection", async () => {
    const { result } = setup();
    await act(async () => {
      result.current.copyCells();
      await Promise.resolve();
    });

    expect(written).toEqual([]);
  });
});

/**
 * Address resolution is the whole of the context-menu Copy fix.
 *
 * The menu names a row by key and a column by key. Turning that into a grid
 * address has to survive everything that moves a row away from its dataset
 * position — a page, a virtual window, a sort — and everything that moves a
 * column away from its declared one: pinning reorders the visible list, and
 * hiding removes a column from it entirely.
 */
const WINDOW_ROWS: Row[] = [
  { id: "21", name: "Katherine", city: "Hampton" },
  { id: "22", name: "Dorothy", city: "Newport News" },
  { id: "23", name: "Mary", city: "Baltimore" },
];

const windowed = (
  columns: ColumnDef<Row>[] = COLUMNS,
  rows: Row[] = WINDOW_ROWS
) =>
  renderHook(() =>
    useGridFocus<Row>({
      enabled: true,
      // The dataset is far larger than the window; only these rows are handed
      // over, starting at index 20 — a page or a virtual scroll position.
      rowCount: 500,
      rows,
      columns,
      firstRowIndex: 20,
      getRowId: (row) => row.id,
    })
  );

describe("contextMenuCopyTarget", () => {
  it("resolves a windowed row to its dataset address", async () => {
    const { result } = windowed();
    const copy = contextMenuCopyTarget(result.current, {
      kind: "cell",
      rowId: "22",
      columnKey: "city",
    });

    expect(copy).toEqual({ available: true, cell: { row: 21, col: 1 } });

    // The address only matters if it reads the row it names, so take the
    // round trip rather than trusting the coordinate.
    await act(async () => {
      result.current.copyCells(copy.cell);
      await Promise.resolve();
    });
    expect(written).toEqual(["Newport News"]);
  });

  it("keeps the selection when the click lands inside it", async () => {
    const { result } = windowed();
    act(() => {
      result.current.selectRange({
        anchor: { row: 20, col: 0 },
        head: { row: 21, col: 1 },
      });
    });
    const copy = contextMenuCopyTarget(result.current, {
      kind: "cell",
      rowId: "21",
      columnKey: "name",
    });

    // No cell: copy the rectangle the reader built.
    expect(copy).toEqual({ available: true });
    await act(async () => {
      result.current.copyCells(copy.cell);
      await Promise.resolve();
    });
    expect(written[0]).toContain("Katherine\tHampton");
    expect(written[0]).toContain("Dorothy\tNewport News");
  });

  it("takes the clicked cell when the selection is somewhere else", async () => {
    const { result } = windowed();
    act(() => {
      result.current.selectRange({
        anchor: { row: 20, col: 0 },
        head: { row: 20, col: 1 },
      });
    });
    const copy = contextMenuCopyTarget(result.current, {
      kind: "cell",
      rowId: "23",
      columnKey: "name",
    });

    await act(async () => {
      result.current.copyCells(copy.cell);
      await Promise.resolve();
    });
    expect(written).toEqual(["Mary"]);
  });

  it("addresses a pinned column by where it is displayed", async () => {
    // Pinning moves City to the front, so its displayed index is 0 even
    // though the declaration order puts it second.
    const pinnedFirst: ColumnDef<Row>[] = [COLUMNS[1]!, COLUMNS[0]!];
    const { result } = windowed(pinnedFirst);
    const copy = contextMenuCopyTarget(result.current, {
      kind: "cell",
      rowId: "22",
      columnKey: "city",
    });

    expect(copy.cell).toEqual({ row: 21, col: 0 });
    await act(async () => {
      result.current.copyCells(copy.cell);
      await Promise.resolve();
    });
    expect(written).toEqual(["Newport News"]);
  });

  it("copies nothing for a column that is not displayed", async () => {
    const { result } = windowed([COLUMNS[0]!]);
    const copy = contextMenuCopyTarget(result.current, {
      kind: "cell",
      rowId: "22",
      columnKey: "city",
    });

    expect(copy).toEqual({ available: false });
    await act(async () => {
      result.current.copyCells(copy.cell);
      await Promise.resolve();
    });
    // With no cell AND no selection, copyCells must not fall back to
    // anything — a hidden column has no value to hand over.
    expect(written).toEqual([]);
  });

  it("copies nothing for a row outside the window", () => {
    const { result } = windowed();
    expect(
      contextMenuCopyTarget(result.current, {
        kind: "cell",
        rowId: "999",
        columnKey: "name",
      })
    ).toEqual({ available: false });
  });

  it("copies nothing for a group row or any other non-cell target", () => {
    const { result } = windowed();
    for (const target of [
      { kind: "group", rowId: "g:London", columnKey: "name" },
      { kind: "header", columnKey: "name" },
      { kind: "row", rowId: "22" },
      { kind: "cell", rowId: "22" },
    ]) {
      expect(contextMenuCopyTarget(result.current, target)).toEqual({
        available: false,
      });
    }
  });

  it("answers nothing at all when the grid supplies no row identity", () => {
    const { result } = setup();
    expect(
      contextMenuCopyTarget(result.current, {
        kind: "cell",
        rowId: "1",
        columnKey: "name",
      })
    ).toEqual({ available: false });
  });
});

describe("keyboard copy is untouched by row identity", () => {
  it("still copies the focused range in a window", async () => {
    const { result } = windowed();
    act(() => {
      result.current.selectRange({
        anchor: { row: 21, col: 0 },
        head: { row: 22, col: 1 },
      });
    });
    await act(async () => {
      // Ctrl+C takes no cell — the range is the whole of its input, exactly
      // as it was before `getRowId` and `cellAt` existed.
      result.current.copyCells();
      await Promise.resolve();
    });

    expect(written[0]).toContain("Dorothy\tNewport News");
    expect(written[0]).toContain("Mary\tBaltimore");
    expect(written[0]).not.toContain("Katherine");
  });
});
