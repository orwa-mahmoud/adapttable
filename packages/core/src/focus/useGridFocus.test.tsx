/**
 * The focus hook against a real DOM.
 *
 * The arithmetic is covered in `gridFocus.test.ts`; what matters here is
 * everything that only exists once something is rendered — that the DOM
 * actually follows the state, that the ARIA indices are absolute under
 * virtualization, that a cell the virtualizer has not mounted is still
 * reachable, and that omitting the prop leaves the markup untouched.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../types";
import type { CellEdit } from "./cellEdits";
import { cellRangeSize } from "./cellRange";
import { FillHandleChrome, type FillHandleSlots } from "./FillHandle";
import { type GridCell } from "./gridFocus";
import { useGridFocus } from "./useGridFocus";

interface Row {
  id: string;
  name: string;
  team: string;
}

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
];
/** The same table, with the cells open for writing. */
const EDITABLE = COLUMNS.map((column) => ({ ...column, editable: true }));
const fillHandleSlots: FillHandleSlots = {
  Handle: ({ handleProps }) => (
    <span {...handleProps} data-adapttable-part="fill-handle" />
  ),
};

function makeRows(count: number, from = 0): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(from + i),
    name: `Name ${from + i}`,
    team: `Team ${from + i}`,
  }));
}

/** A table wired exactly the way an adapter wires it. */
function Grid(props: {
  enabled?: boolean;
  rowCount?: number;
  rows?: Row[];
  firstRowIndex?: number;
  dir?: "ltr" | "rtl";
  pageSize?: number;
  scrollToRow?: (row: number) => void;
  onActivate?: (cell: GridCell) => void;
  /** Render only the first N loaded rows — what a virtualizer does. */
  renderLimit?: number;
  /** Headers that sort, so a plain click is already claimed. */
  sortableHeaders?: boolean;
  onCut?: (range: { anchor: GridCell; head: GridCell }) => void;
  onPaste?: (edits: CellEdit<Row>[]) => void;
  onFill?: (edits: CellEdit<Row>[]) => void;
  onUndo?: () => number;
  onRedo?: () => number;
  onFind?: () => void;
  /** Columns a paste is allowed to write into. */
  editable?: boolean;
  /** Offer the per-column header checkbox. */
  headerCheckbox?: boolean;
}) {
  const rows = props.rows ?? makeRows(3);
  const columns = props.editable === true ? EDITABLE : COLUMNS;
  const focus = useGridFocus<Row>({
    enabled: props.enabled ?? true,
    headerCheckbox: props.headerCheckbox,
    rowCount: props.rowCount ?? rows.length,
    columns,
    rows,
    firstRowIndex: props.firstRowIndex,
    pageSize: props.pageSize,
    dir: props.dir,
    scrollToRow: props.scrollToRow,
    onActivate: props.onActivate,
    onCut: props.onCut,
    onPaste: props.onPaste,
    onFill: props.onFill,
    onUndo: props.onUndo,
    onRedo: props.onRedo,
    onFind: props.onFind,
  });
  const first = props.firstRowIndex ?? 0;
  const rendered =
    props.renderLimit === undefined ? rows : rows.slice(0, props.renderLimit);
  return (
    <>
      <table {...focus.getGridProps()}>
        <thead>
          <tr>
            {COLUMNS.map((column, col) => (
              <th
                key={column.key}
                {...focus.getColumnHeaderProps(col, {
                  sortable: props.sortableHeaders,
                })}
              >
                {column.key}
                {focus.columnCheckbox && (
                  <button
                    type="button"
                    data-checkbox={column.key}
                    aria-pressed={focus.isColumnSelected(col)}
                    onClick={(event) => {
                      // What core's chrome does for a kit: keep the click off
                      // the header, then toggle.
                      event.stopPropagation();
                      focus.toggleColumn(col);
                    }}
                  >
                    select
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rendered.map((row, i) => (
            <tr key={row.id} {...focus.getRowProps(first + i)}>
              {COLUMNS.map((column, col) => (
                <td
                  key={column.key}
                  {...focus.getCellProps({ row: first + i, col })}
                >
                  {column.accessor?.(row)}
                  <FillHandleChrome
                    focus={focus}
                    windowIndex={i}
                    col={col}
                    firstRowIndex={first}
                    slots={fillHandleSlots}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <output>{focus.announcement}</output>
      <data value={String(focus.range ? cellRangeSize(focus.range) : 0)}>
        {focus.range
          ? `${focus.range.anchor.row}:${focus.range.anchor.col}-${focus.range.head.row}:${focus.range.head.col}`
          : "none"}
      </data>
    </>
  );
}

/** What the harness is currently reporting as selected. */
const selection = () => document.querySelector("data")?.textContent;
const selectionSize = () =>
  document.querySelector("data")?.getAttribute("value");

const cellAt = (row: number, col: number) =>
  document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`);

describe("useGridFocus", () => {
  it("makes the table one tab stop with the first cell tabbable", () => {
    render(<Grid />);
    expect(cellAt(0, 0)).toHaveAttribute("tabindex", "0");
    // Every other cell is out of the tab order, so Tab leaves the table.
    expect(cellAt(0, 1)).toHaveAttribute("tabindex", "-1");
    expect(cellAt(2, 1)).toHaveAttribute("tabindex", "-1");
  });

  it("moves the DOM focus, not just the state", () => {
    render(<Grid />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(cellAt(1, 0)).toHaveFocus();
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(cellAt(1, 1)).toHaveFocus();
  });

  it("rotates the tab stop so only the focused cell is tabbable", () => {
    render(<Grid />);
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowDown" });
    expect(cellAt(1, 0)).toHaveAttribute("tabindex", "0");
    expect(cellAt(0, 0)).toHaveAttribute("tabindex", "-1");
  });

  it("swaps the arrows under RTL", () => {
    render(<Grid dir="rtl" />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    // Left is visually forward in a mirrored table.
    expect(cellAt(0, 1)).toHaveFocus();
  });

  it("carries the dataset totals, not the rendered count", () => {
    // 24 rendered rows of a 100,000-row set — the virtualized case.
    render(
      <Grid
        rows={makeRows(24, 40000)}
        rowCount={100000}
        firstRowIndex={40000}
      />
    );
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-rowcount", "100000");
    expect(grid).toHaveAttribute("aria-colcount", "2");
  });

  it("numbers rows and columns absolutely, so row 40,001 says so", () => {
    render(
      <Grid
        rows={makeRows(24, 40000)}
        rowCount={100000}
        firstRowIndex={40000}
      />
    );
    // Body rows specifically: the harness renders a header row for column
    // selection, and `getAllByRole("row")` would hand that one back first.
    const rows = document.querySelectorAll("tbody tr");
    // Not "1" — that is the bug this exists to prevent.
    expect(rows[0]).toHaveAttribute("aria-rowindex", "40001");
    expect(cellAt(40000, 0)).toHaveAttribute("aria-colindex", "1");
    expect(cellAt(40000, 1)).toHaveAttribute("aria-colindex", "2");
  });

  it("asks the virtualizer for a loaded row that is not mounted", () => {
    const scrollToRow = vi.fn();
    // 1,000 rows loaded, 24 mounted — the virtualized case. Ctrl+End addresses
    // the last LOADED row, which the virtualizer must bring into the DOM.
    render(
      <Grid
        rows={makeRows(1000, 0)}
        rowCount={100000}
        renderLimit={24}
        scrollToRow={scrollToRow}
        pageSize={24}
      />
    );
    fireEvent.keyDown(screen.getByRole("grid"), { key: "End", ctrlKey: true });
    expect(scrollToRow).toHaveBeenCalledWith(999);
  });

  it("never moves past the last loaded row, however large the dataset", () => {
    const scrollToRow = vi.fn();
    // 24 loaded of 100,000: row 99,999 sits on another page and is unreachable,
    // so moving there would announce a cell the user cannot see.
    render(
      <Grid
        rows={makeRows(24, 0)}
        rowCount={100000}
        scrollToRow={scrollToRow}
      />
    );
    fireEvent.keyDown(screen.getByRole("grid"), { key: "End", ctrlKey: true });
    expect(cellAt(23, 1)).toHaveFocus();
    expect(scrollToRow).toHaveBeenCalledWith(23);
  });

  it("focuses a cell once a later render mounts it", () => {
    // 100 rows loaded, 24 mounted. PageDown targets row 24 — loaded, so a legal
    // move, but not in the DOM yet.
    const { rerender } = render(
      <Grid
        rows={makeRows(100, 0)}
        rowCount={100}
        renderLimit={24}
        pageSize={24}
      />
    );
    fireEvent.keyDown(screen.getByRole("grid"), { key: "PageDown" });
    expect(cellAt(24, 0)).toBeNull();

    // The virtualizer scrolls; the mounted window now includes row 24.
    rerender(
      <Grid
        rows={makeRows(100, 0)}
        rowCount={100}
        renderLimit={40}
        pageSize={24}
      />
    );
    expect(cellAt(24, 0)).toHaveFocus();
  });

  it("announces the column, the cell's text and the absolute position", () => {
    render(
      <Grid
        rows={makeRows(24, 40000)}
        rowCount={100000}
        firstRowIndex={40000}
      />
    );
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowDown" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Name, Name 40001, row 40002 of 100000"
    );
  });

  it("hands Enter and F2 to the editing model", () => {
    const onActivate = vi.fn();
    render(<Grid onActivate={onActivate} />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    fireEvent.keyDown(grid, { key: "Enter" });
    expect(onActivate).toHaveBeenCalledWith({ row: 1, col: 0 });
    fireEvent.keyDown(grid, { key: "F2" });
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it("stays silent until the grid is entered", () => {
    render(<Grid />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("enters at the first cell when a key arrives before any focus", () => {
    render(<Grid />);
    // ArrowUp from nowhere is still an entry: the user needs to hear where
    // they landed, even though the move itself had nowhere to go.
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowUp" });
    expect(cellAt(0, 0)).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Name, Name 0, row 1 of 3"
    );
  });

  it("says nothing new when an edge move changes nothing", () => {
    render(<Grid />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowUp" });
    const entered = screen.getByRole("status").textContent;

    fireEvent.keyDown(grid, { key: "ArrowUp" });

    // Already at the top: focus holds and the live region is not re-announced,
    // so a held-down arrow does not chatter at the edge.
    expect(cellAt(0, 0)).toHaveFocus();
    expect(screen.getByRole("status").textContent).toBe(entered);
  });

  it("follows a click, so the mouse and the keyboard agree", () => {
    render(<Grid />);
    const target = cellAt(2, 1);
    if (!target) throw new Error("cell 2:1 should be rendered");
    fireEvent.focus(target);
    expect(target).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowUp" });
    expect(cellAt(1, 1)).toHaveFocus();
  });

  it("offsets the window with getCellPropsAt, so adapters pass what they have", () => {
    // An adapter maps source.rows and has index 0..23; the dataset row is
    // 40000..40023. Doing that arithmetic in eight adapters is how it goes
    // wrong, so the hook does it.
    function Windowed() {
      const rows = makeRows(24, 40000);
      const focus = useGridFocus<Row>({
        enabled: true,
        rowCount: 100000,
        columns: COLUMNS,
        rows,
        firstRowIndex: 40000,
      });
      return (
        <table {...focus.getGridProps()}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} {...focus.getRowPropsAt(i)}>
                {COLUMNS.map((column, col) => (
                  <td key={column.key} {...focus.getCellPropsAt(i, col)}>
                    {column.accessor?.(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    render(<Windowed />);
    expect(screen.getAllByRole("row")[0]).toHaveAttribute(
      "aria-rowindex",
      "40001"
    );
    expect(cellAt(40000, 0)).not.toBeNull();
    expect(cellAt(0, 0)).toBeNull();
  });

  it("extends a selection with Shift and an arrow", () => {
    render(<Grid />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    // Anchored where focus was, head where it moved to.
    expect(selection()).toBe("1:0-2:0");
    expect(selectionSize()).toBe("2");
  });

  it("shrinks back toward the anchor rather than reversing", () => {
    render(<Grid />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    expect(selectionSize()).toBe("3");
    fireEvent.keyDown(grid, { key: "ArrowUp", shiftKey: true });
    expect(selectionSize()).toBe("2");
    expect(selection()).toBe("0:0-1:0");
  });

  it("collapses the selection on a plain move", () => {
    render(<Grid />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    expect(selectionSize()).toBe("2");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    // A stale rectangle must not linger once the user simply moves.
    expect(selectionSize()).toBe("1");
  });

  it("selects a rectangle across rows and columns", () => {
    render(<Grid />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(grid, { key: "ArrowRight", shiftKey: true });
    expect(selectionSize()).toBe("4");
    expect(cellAt(0, 0)).toHaveAttribute("data-cell-selected");
    expect(cellAt(1, 1)).toHaveAttribute("data-cell-selected");
    expect(cellAt(2, 0)).not.toHaveAttribute("data-cell-selected");
  });

  it("extends to a shift-clicked cell", () => {
    render(<Grid />);
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowDown" });
    const target = cellAt(2, 1);
    if (!target) throw new Error("cell 2:1 should be rendered");
    fireEvent.mouseDown(target, { shiftKey: true });
    expect(selection()).toBe("1:0-2:1");
  });

  it("marks a real rectangle with aria-selected, a lone cell with nothing", () => {
    render(<Grid />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    // Arrowing around is not selection mode; saying so would mislead.
    expect(cellAt(1, 0)).not.toHaveAttribute("aria-selected");
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    expect(cellAt(1, 0)).toHaveAttribute("aria-selected", "true");
    expect(cellAt(0, 1)).toHaveAttribute("aria-selected", "false");
  });

  it("costs nothing when it is off — byte-identical markup", () => {
    const on = render(<Grid enabled={false} />);
    const off = on.container.querySelector("table")?.outerHTML;
    on.unmount();

    // A plain table rendered with no focus props at all. Comparing the TABLE
    // rather than the container keeps the harness's own scaffolding out of it.
    function Plain() {
      const rows = makeRows(3);
      return (
        <table>
          {/* The harness renders a header row so column selection has
              something to click; the comparison arm needs the same markup, or
              the test measures the header rather than the focus props. */}
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key}>{column.key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {COLUMNS.map((column) => (
                  <td key={column.key}>{column.accessor?.(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    const plain = render(<Plain />);
    expect(off).toBe(plain.container.querySelector("table")?.outerHTML);
  });

  it("ignores the keyboard entirely when it is off", () => {
    render(<Grid enabled={false} />);
    // No role="grid", so there is nothing to key against; the cells are not
    // tabbable and pressing a key changes nothing.
    expect(screen.queryByRole("grid")).toBeNull();
    expect(cellAt(0, 0)).toBeNull();
  });

  /**
   * A windowed table only has a slice of its rows in the DOM, so assistive
   * tech counts what it can reach and calls a 40,000-row dataset three rows
   * long. The size is a fact about the table, not about cell navigation.
   */
  describe("a window's size, with cell navigation off", () => {
    const table = () => document.querySelector("table");
    const rows = () => [...document.querySelectorAll("tbody tr")];

    it("states the real row count", () => {
      render(<Grid enabled={false} rowCount={40_000} rows={makeRows(3)} />);
      expect(table()).toHaveAttribute("aria-rowcount", "40000");
      // Only the rows are a window, so no aria-colcount: it would promise an
      // aria-colindex per cell that nothing outside cell navigation sets.
      expect(table()).not.toHaveAttribute("aria-colcount");
      // Still not a grid: nothing here provides grid keyboard semantics.
      expect(screen.queryByRole("grid")).toBeNull();
    });

    it("numbers each mounted row from its absolute position", () => {
      render(
        <Grid
          enabled={false}
          rowCount={40_000}
          rows={makeRows(3, 120)}
          firstRowIndex={120}
        />
      );
      expect(rows().map((r) => r.getAttribute("aria-rowindex"))).toEqual([
        "121",
        "122",
        "123",
      ]);
    });

    it("says nothing when every row is already in the DOM", () => {
      render(<Grid enabled={false} />);
      expect(table()).not.toHaveAttribute("aria-rowcount");
      expect(rows()[0]).not.toHaveAttribute("aria-rowindex");
    });

    it("leaves the counts alone when cell navigation is on", () => {
      render(<Grid rowCount={40_000} rows={makeRows(3)} />);
      expect(screen.getByRole("grid")).toHaveAttribute(
        "aria-rowcount",
        "40000"
      );
      expect(rows()[0]).toHaveAttribute("aria-rowindex", "1");
    });
  });
});

/**
 * Range and column selection (#300) — the three halves the keyboard did not
 * cover: dragging with the pointer, selecting whole columns, and saying out loud
 * WHAT was selected rather than only where focus is.
 */
describe("useGridFocus — drag, columns and the range announcement", () => {
  const headers = () => document.querySelectorAll<HTMLElement>("th");

  it("extends the selection while the pointer drags across cells", () => {
    render(<Grid rows={makeRows(4)} />);
    fireEvent.mouseDown(cellAt(0, 0)!);
    fireEvent.mouseEnter(cellAt(0, 1)!);
    fireEvent.mouseEnter(cellAt(1, 1)!);
    // One update per cell entered, and the rectangle is anchored where the
    // press landed: rows 0-1 × cols 0-1.
    expect(selectionSize()).toBe("4");
  });

  it("stops extending once the pointer is released", () => {
    render(<Grid rows={makeRows(4)} />);
    fireEvent.mouseDown(cellAt(0, 0)!);
    fireEvent.mouseUp(cellAt(0, 0)!);
    fireEvent.mouseEnter(cellAt(2, 1)!);
    expect(selectionSize()).toBe("1");
  });

  it("ends a drag that was released outside the table", () => {
    // Otherwise the drag stays armed and the next hover anywhere in the grid
    // extends a selection the user never started.
    render(<Grid rows={makeRows(4)} />);
    fireEvent.mouseDown(cellAt(0, 0)!);
    fireEvent.mouseUp(window);
    fireEvent.mouseEnter(cellAt(2, 1)!);
    expect(selectionSize()).toBe("1");
  });

  it("selects a whole column from its header", () => {
    render(<Grid rows={makeRows(4)} />);
    fireEvent.click(headers()[1]!);
    expect(selectionSize()).toBe("4");
  });

  it("selects only the LOADED rows of a column", () => {
    // The dataset says 1,000 rows; four are in hand. Claiming the rest would
    // copy or export rows the browser has never seen.
    render(<Grid rows={makeRows(4)} rowCount={1000} />);
    fireEvent.click(headers()[0]!);
    expect(selectionSize()).toBe("4");
  });

  it("extends to a second column with Ctrl+click", () => {
    render(<Grid rows={makeRows(4)} />);
    fireEvent.click(headers()[0]!);
    fireEvent.click(headers()[1]!, { ctrlKey: true });
    expect(selectionSize()).toBe("8");
  });

  it("announces the rectangle's edges and size, not just the cell", () => {
    render(<Grid rows={makeRows(4)} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(cellAt(0, 1)!, { key: "ArrowDown", shiftKey: true });
    expect(document.querySelector("output")?.textContent).toBe(
      "selected rows 1 to 2, columns 1 to 2, 4 cells"
    );
  });

  it("says nothing extra for a single cell — the cell announced itself", () => {
    render(<Grid rows={makeRows(4)} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowRight" });
    expect(document.querySelector("output")?.textContent).toContain("row 1 of");
  });
});

describe("useGridFocus — the column-select gesture never fights sorting", () => {
  it("ignores a plain click on a sortable header", () => {
    // Sorting has always owned that click; selection must not steal it.
    render(<Grid rows={makeRows(4)} sortableHeaders />);
    fireEvent.click(document.querySelectorAll<HTMLElement>("th")[0]!);
    expect(document.querySelector("data")?.textContent).toBe("none");
  });

  it("still selects a sortable column on Ctrl+click", () => {
    render(<Grid rows={makeRows(4)} sortableHeaders />);
    fireEvent.click(document.querySelectorAll<HTMLElement>("th")[0]!, {
      ctrlKey: true,
    });
    expect(document.querySelector("data")?.getAttribute("value")).toBe("4");
  });
});

describe("useGridFocus — the header checkbox into the same selection", () => {
  const box = (key: string) =>
    document.querySelector<HTMLElement>(`[data-checkbox="${key}"]`);

  it("stays off until the host asks for it", () => {
    render(<Grid rows={makeRows(4)} />);

    expect(box("name")).toBeNull();
  });

  it("stays off with cell navigation off, whatever the host asked for", () => {
    render(<Grid rows={makeRows(4)} enabled={false} headerCheckbox />);

    // There is no selection to select into, so a control for it would be a
    // control that does nothing.
    expect(box("name")).toBeNull();
  });

  it("selects the loaded rows of its column", () => {
    render(<Grid rows={makeRows(4)} rowCount={1000} headerCheckbox />);

    fireEvent.click(box("name")!);

    expect(selectionSize()).toBe("4");
    expect(box("name")).toHaveAttribute("aria-pressed", "true");
  });

  it("clears on a second toggle", () => {
    render(<Grid rows={makeRows(4)} headerCheckbox />);

    fireEvent.click(box("name")!);
    fireEvent.click(box("name")!);

    // Nothing selected is the only state one checkbox can return to.
    expect(selection()).toBe("none");
    expect(box("name")).toHaveAttribute("aria-pressed", "false");
  });

  it("moves the selection when a second column is ticked", () => {
    render(<Grid rows={makeRows(4)} headerCheckbox />);

    fireEvent.click(box("name")!);
    fireEvent.click(box("team")!);

    expect(selectionSize()).toBe("4");
    expect(box("name")).toHaveAttribute("aria-pressed", "false");
    expect(box("team")).toHaveAttribute("aria-pressed", "true");
  });

  it("reads as unchecked for a column inside a wider rectangle", () => {
    render(<Grid rows={makeRows(4)} headerCheckbox />);

    // Two columns selected by the gesture: neither box may claim the
    // selection is its own column.
    fireEvent.click(document.querySelectorAll<HTMLElement>("th")[0]!);
    fireEvent.click(document.querySelectorAll<HTMLElement>("th")[1]!, {
      ctrlKey: true,
    });

    expect(selectionSize()).toBe("8");
    expect(box("name")).toHaveAttribute("aria-pressed", "false");
    expect(box("team")).toHaveAttribute("aria-pressed", "false");
  });

  it("reads as unchecked for a rectangle that does not span every row", () => {
    render(<Grid rows={makeRows(4)} headerCheckbox />);
    act(() => cellAt(0, 0)!.focus());

    // One column, two rows. Saying that column is selected would tell the
    // reader a copy covers rows it does not.
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowDown", shiftKey: true });

    expect(selectionSize()).toBe("2");
    expect(box("name")).toHaveAttribute("aria-pressed", "false");
  });

  it("reaches the same selection the Ctrl/Cmd gesture does", () => {
    render(<Grid rows={makeRows(4)} headerCheckbox />);

    fireEvent.click(box("team")!);
    const viaCheckbox = selection();

    fireEvent.click(box("team")!);
    fireEvent.click(document.querySelectorAll<HTMLElement>("th")[1]!);

    expect(selection()).toBe(viaCheckbox);
  });
});

describe("useGridFocus — copy and cut the selection", () => {
  const clipboard = () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    return writeText;
  };

  it("copies the rectangle as TSV on Ctrl+C", async () => {
    const writeText = clipboard();
    render(<Grid rows={makeRows(3)} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(cellAt(0, 1)!, { key: "c", ctrlKey: true });
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText.mock.calls[0]?.[0]).toBe("Name 0\tTeam 0");
    vi.unstubAllGlobals();
  });

  it("says how much was copied", async () => {
    clipboard();
    render(<Grid rows={makeRows(3)} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(cellAt(1, 0)!, { key: "c", metaKey: true });
    await waitFor(() =>
      expect(document.querySelector("output")?.textContent).toBe(
        "2 cells copied"
      )
    );
    vi.unstubAllGlobals();
  });

  it("says so when the clipboard refuses, rather than failing silently", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
    });
    render(<Grid rows={makeRows(3)} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(cellAt(0, 1)!, { key: "c", ctrlKey: true });
    await waitFor(() =>
      expect(document.querySelector("output")?.textContent).toBe("Copy failed")
    );
    vi.unstubAllGlobals();
  });

  it("tells the host what was cut, only after the copy landed", async () => {
    clipboard();
    const onCut = vi.fn();
    render(<Grid rows={makeRows(3)} onCut={onCut} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(cellAt(0, 1)!, { key: "x", ctrlKey: true });
    await waitFor(() => expect(onCut).toHaveBeenCalledOnce());
    // The table clears nothing itself: a cut that emptied cells before the
    // clipboard accepted them would lose the data outright.
    expect(onCut.mock.calls[0]?.[0]).toMatchObject({ anchor: { row: 0 } });
    vi.unstubAllGlobals();
  });

  it("leaves the browser's own copy alone when nothing is selected", () => {
    const writeText = clipboard();
    render(<Grid rows={makeRows(3)} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "c", ctrlKey: true });
    expect(writeText).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("useGridFocus — paste from a spreadsheet", () => {
  const clipboard = (text: string) => {
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockResolvedValue(text) },
    });
  };

  it("writes the clipboard's block from the focused cell on Ctrl+V", async () => {
    clipboard("A\tB\nC\tD");
    const onPaste = vi.fn();
    render(<Grid rows={makeRows(3)} editable onPaste={onPaste} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "v", ctrlKey: true });
    await waitFor(() => expect(onPaste).toHaveBeenCalledOnce());
    const edits = onPaste.mock.calls[0]?.[0] as CellEdit<Row>[];
    // The clipboard's 2×2 shape wins over the single selected cell.
    expect(edits).toHaveLength(4);
    expect(edits[0]).toMatchObject({ columnKey: "name", value: "A" });
    expect(edits[3]).toMatchObject({ columnKey: "team", value: "D" });
    vi.unstubAllGlobals();
  });

  it("says how much was pasted", async () => {
    clipboard("A\tB");
    render(<Grid rows={makeRows(3)} editable onPaste={vi.fn()} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "v", metaKey: true });
    await waitFor(() =>
      expect(document.querySelector("output")?.textContent).toBe(
        "2 cells pasted"
      )
    );
    vi.unstubAllGlobals();
  });

  it("says so when the browser will not hand over the clipboard", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<Grid rows={makeRows(3)} editable onPaste={vi.fn()} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "v", ctrlKey: true });
    await waitFor(() =>
      expect(document.querySelector("output")?.textContent).toBe("Paste failed")
    );
    vi.unstubAllGlobals();
  });

  it("writes nothing into read-only columns", async () => {
    clipboard("A\tB");
    const onPaste = vi.fn();
    render(<Grid rows={makeRows(3)} onPaste={onPaste} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "v", ctrlKey: true });
    await waitFor(() => expect(onPaste).toHaveBeenCalledOnce());
    expect(onPaste.mock.calls[0]?.[0]).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("leaves the browser's own paste alone when the host takes no edits", () => {
    const readText = vi.fn().mockResolvedValue("A");
    vi.stubGlobal("navigator", { clipboard: { readText } });
    render(<Grid rows={makeRows(3)} editable />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "v", ctrlKey: true });
    expect(readText).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("useGridFocus — the fill handle", () => {
  const handle = () =>
    document.querySelector<HTMLElement>(
      '[data-adapttable-part="fill-handle"]'
    )!;

  it("carries the selection's values to where the drag ended", () => {
    const onFill = vi.fn();
    render(<Grid rows={makeRows(4)} editable onFill={onFill} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.mouseDown(cellAt(0, 0)!);
    fireEvent.mouseUp(cellAt(0, 0)!);
    fireEvent.mouseDown(handle());
    fireEvent.mouseEnter(cellAt(2, 0)!);
    fireEvent.mouseUp(window);
    expect(onFill).toHaveBeenCalledOnce();
    expect(onFill.mock.calls[0]?.[0]).toEqual([
      {
        row: expect.objectContaining({ id: "1" }),
        columnKey: "name",
        value: "Name 0",
      },
      {
        row: expect.objectContaining({ id: "2" }),
        columnKey: "name",
        value: "Name 0",
      },
    ]);
    expect(document.querySelector("output")?.textContent).toBe(
      "2 cells filled"
    );
  });

  it("leaves the filled rectangle selected, ready for the next one", () => {
    render(<Grid rows={makeRows(4)} editable onFill={vi.fn()} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.mouseDown(cellAt(0, 0)!);
    fireEvent.mouseUp(cellAt(0, 0)!);
    fireEvent.mouseDown(handle());
    fireEvent.mouseEnter(cellAt(2, 0)!);
    fireEvent.mouseUp(window);
    expect(selectionSize()).toBe("3");
  });

  it("writes nothing when the drag never left the selection", () => {
    const onFill = vi.fn();
    render(<Grid rows={makeRows(4)} editable onFill={onFill} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.mouseDown(cellAt(0, 0)!);
    fireEvent.mouseUp(cellAt(0, 0)!);
    fireEvent.mouseDown(handle());
    fireEvent.mouseEnter(cellAt(0, 0)!);
    fireEvent.mouseUp(window);
    expect(onFill).not.toHaveBeenCalled();
  });

  it("does not start a selection drag from the handle itself", () => {
    // The cell's own press collapses the selection; the handle's must not.
    render(<Grid rows={makeRows(4)} editable onFill={vi.fn()} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowDown", shiftKey: true });
    expect(selectionSize()).toBe("2");
    fireEvent.mouseDown(handle());
    expect(selectionSize()).toBe("2");
  });

  it("fills the selection down on Ctrl+D", () => {
    const onFill = vi.fn();
    render(<Grid rows={makeRows(4)} editable onFill={onFill} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(cellAt(1, 0)!, { key: "d", ctrlKey: true });
    expect(onFill.mock.calls[0]?.[0]).toHaveLength(1);
    expect(document.querySelector("output")?.textContent).toBe("1 cell filled");
  });

  it("leaves Ctrl+D to the browser on a one-row selection", () => {
    const onFill = vi.fn();
    render(<Grid rows={makeRows(4)} editable onFill={onFill} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "ArrowRight", shiftKey: true });
    fireEvent.keyDown(cellAt(0, 1)!, { key: "d", ctrlKey: true });
    expect(onFill).not.toHaveBeenCalled();
  });
});

describe("useGridFocus — undo and redo keys", () => {
  it("undoes on Ctrl/Cmd+Z and says how much came back", () => {
    const onUndo = vi.fn().mockReturnValue(3);
    render(<Grid rows={makeRows(3)} onUndo={onUndo} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "z", metaKey: true });
    expect(onUndo).toHaveBeenCalledOnce();
    expect(document.querySelector("output")?.textContent).toBe(
      "3 cells restored"
    );
  });

  it("redoes on both spellings — Ctrl+Shift+Z and Ctrl+Y", () => {
    const onRedo = vi.fn().mockReturnValue(1);
    render(<Grid rows={makeRows(3)} onRedo={onRedo} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, {
      key: "z",
      ctrlKey: true,
      shiftKey: true,
    });
    fireEvent.keyDown(cellAt(0, 0)!, { key: "y", ctrlKey: true });
    expect(onRedo).toHaveBeenCalledTimes(2);
    expect(document.querySelector("output")?.textContent).toBe("1 cell redone");
  });

  it("says so rather than swallowing an empty history", () => {
    render(<Grid rows={makeRows(3)} onUndo={() => 0} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "z", ctrlKey: true });
    expect(document.querySelector("output")?.textContent).toBe(
      "Nothing to undo"
    );
  });

  it("leaves the key to the browser when no history is wired", () => {
    render(<Grid rows={makeRows(3)} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "z", ctrlKey: true });
    expect(document.querySelector("output")?.textContent).toBe("");
  });

  it("opens find on Ctrl/Cmd+F when the table has a find bar", () => {
    const onFind = vi.fn();
    render(<Grid rows={makeRows(3)} onFind={onFind} />);
    act(() => cellAt(0, 0)!.focus());
    fireEvent.keyDown(cellAt(0, 0)!, { key: "f", ctrlKey: true });
    expect(onFind).toHaveBeenCalledOnce();
  });
});
