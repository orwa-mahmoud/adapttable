import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import type { DirtyEdits, EditHistoryHandle } from "../props";
import {
  type DataTableShellProps,
  type DataTableShellResult,
  useDataTableShell,
} from "../useDataTableShell";
import { cellNavigation } from "./cell-navigation";
import { DataTableShellView } from "./chromeBodyGate";
import { editHistory } from "./edit-history";
import { dirtyIndicators, editing } from "./editing";
import { FeatureProviders } from "./providers";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

/**
 * Edit history, the unsaved-edit marks and the cell range reach a host
 * through the features that own them — no shell hook needed.
 */
interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, editable: true },
  { key: "id", header: "Id", accessor: (r) => r.id },
];

const noForm = () => null;

function Shell({
  props,
  onView,
}: {
  readonly props: DataTableShellProps<Row>;
  readonly onView: (view: DataTableShellResult<Row>) => void;
}) {
  const shell = useDataTableShell(props, noForm);
  return (
    <DataTableShellView<Row> shell={shell}>
      {(view: DataTableShellResult<Row>) => {
        onView(view);
        return null;
      }}
    </DataTableShellView>
  );
}

/**
 * The shell's grid drawn as a bare table, so real key events reach the cell
 * navigation handlers the way a kit's cells deliver them.
 */
function GridShell({ props }: { readonly props: DataTableShellProps<Row> }) {
  const shell = useDataTableShell(props, noForm);
  return (
    <DataTableShellView<Row> shell={shell}>
      {(view: DataTableShellResult<Row>) => (
        <table {...view.gridFocus.getGridProps()}>
          <tbody>
            {ROWS.map((row, r) => (
              <tr key={row.id}>
                {columns.map((column, c) => (
                  <td
                    key={column.key}
                    {...view.gridFocus.getCellProps({ row: r, col: c })}
                  >
                    {column.accessor?.(row) as string}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DataTableShellView>
  );
}

function mountGrid(features: readonly TableFeature<Row>[]) {
  const props = applyTableFeatures({
    features,
    data: ROWS,
    columns,
    rowKey: (r: Row) => r.id,
    urlSync: false,
    forceMobile: false,
  });
  render(
    <FeatureProviders props={props}>
      <GridShell props={props} />
    </FeatureProviders>
  );
}

const gridCell = (row: number, col: number) =>
  document.querySelector<HTMLElement>(`[data-grid-cell="${row}:${col}"]`)!;

function mount(features: readonly TableFeature<Row>[]) {
  let latest: DataTableShellResult<Row> | undefined;
  const props = applyTableFeatures({
    features,
    data: ROWS,
    columns,
    rowKey: (r: Row) => r.id,
    urlSync: false,
    forceMobile: false,
  });
  render(
    <FeatureProviders props={props}>
      <Shell
        props={props}
        onView={(view) => {
          latest = view;
        }}
      />
    </FeatureProviders>
  );
  return () => {
    if (!latest) throw new Error("the shell never rendered");
    return latest;
  };
}

describe("host callbacks on the owning features", () => {
  it("hands the host its edit history, and undo acts on the table", () => {
    const onEdit = vi.fn();
    const seen: EditHistoryHandle[] = [];
    const view = mount([
      editing<Row>(onEdit),
      editHistory({ onChange: (history) => seen.push(history) }),
    ]);

    expect(seen.at(-1)?.canUndo).toBe(false);

    act(() => {
      view().chrome.editing?.onCellEdit?.(ROWS[0]!, "name", "Alicia");
    });
    expect(seen.at(-1)?.canUndo).toBe(true);

    act(() => {
      seen.at(-1)?.undo();
    });
    expect(onEdit).toHaveBeenLastCalledWith(ROWS[0], "name", "Alice");
    expect(seen.at(-1)?.canRedo).toBe(true);

    act(() => {
      seen.at(-1)?.redo();
    });
    expect(onEdit).toHaveBeenLastCalledWith(ROWS[0], "name", "Alicia");
    expect(seen.at(-1)?.canUndo).toBe(true);
    expect(seen.at(-1)?.canRedo).toBe(false);

    act(() => {
      seen.at(-1)?.clear();
    });
    expect(seen.at(-1)?.canUndo).toBe(false);
    expect(seen.at(-1)?.canRedo).toBe(false);
  });

  it("reports unsaved edits, and confirmAll clears them", () => {
    const seen: DirtyEdits[] = [];
    const view = mount([
      editing<Row>(vi.fn(), {
        onDirtyChange: (dirty: DirtyEdits) => seen.push(dirty),
      }),
      dirtyIndicators(),
    ]);

    expect(seen.at(-1)?.count).toBe(0);

    act(() => {
      view().chrome.editing?.dirty?.mark("a", "name");
    });
    expect(seen.at(-1)?.count).toBe(1);

    act(() => {
      seen.at(-1)?.confirmAll();
    });
    expect(seen.at(-1)?.count).toBe(0);
  });

  it("reports the selected range and its clearing", () => {
    const onRangeChange = vi.fn();
    const view = mount([cellNavigation({ onRangeChange })]);

    expect(onRangeChange).toHaveBeenLastCalledWith(null);

    const range = { anchor: { row: 0, col: 0 }, head: { row: 1, col: 1 } };
    act(() => {
      view().gridFocus.selectRange(range);
    });
    expect(onRangeChange).toHaveBeenLastCalledWith(range);

    act(() => {
      view().gridFocus.selectRange(null);
    });
    expect(onRangeChange).toHaveBeenLastCalledWith(null);
  });

  it("reports the range real Shift+Arrow presses select", () => {
    const onRangeChange = vi.fn();
    mountGrid([cellNavigation({ onRangeChange })]);
    expect(onRangeChange).toHaveBeenLastCalledWith(null);

    act(() => gridCell(0, 0).focus());
    fireEvent.keyDown(gridCell(0, 0), { key: "ArrowDown", shiftKey: true });
    expect(onRangeChange).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 0 },
    });
    expect(document.activeElement).toBe(gridCell(1, 0));

    fireEvent.keyDown(gridCell(1, 0), { key: "ArrowRight", shiftKey: true });
    expect(onRangeChange).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 1 },
    });
    expect(gridCell(0, 1)).toHaveAttribute("aria-selected", "true");
  });

  it("reports null once a plain arrow press leaves only the focused cell", () => {
    const onRangeChange = vi.fn();
    mountGrid([cellNavigation({ onRangeChange })]);

    act(() => gridCell(0, 0).focus());
    fireEvent.keyDown(gridCell(0, 0), { key: "ArrowDown", shiftKey: true });
    expect(onRangeChange).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 0 },
    });

    onRangeChange.mockClear();
    fireEvent.keyDown(gridCell(1, 0), { key: "ArrowRight" });
    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect(onRangeChange).toHaveBeenLastCalledWith(null);

    fireEvent.keyDown(gridCell(1, 1), { key: "ArrowLeft" });
    expect(onRangeChange).toHaveBeenCalledTimes(1);
  });

  it("records and undoes with a bare editHistory(true)", () => {
    const onEdit = vi.fn();
    const view = mount([editing<Row>(onEdit), editHistory(true)]);
    expect(view().editHistory.enabled).toBe(true);
    expect(view().editHistory.canUndo).toBe(false);

    act(() => {
      view().chrome.editing?.onCellEdit?.(ROWS[0]!, "name", "Alicia");
    });
    expect(view().editHistory.canUndo).toBe(true);

    act(() => {
      view().editHistory.undo();
    });
    expect(onEdit).toHaveBeenLastCalledWith(ROWS[0], "name", "Alice");
    expect(view().editHistory.canRedo).toBe(true);
  });

  it("keeps marking unsaved edits with extras that carry no onDirtyChange", () => {
    const onEdit = vi.fn();
    const onEditStart = vi.fn();
    const view = mount([
      editing<Row>(onEdit, { onEditStart }),
      dirtyIndicators(),
    ]);

    act(() => {
      view().chrome.editing?.dirty?.mark("a", "name");
    });
    expect(view().chrome.editing?.dirty?.count).toBe(1);

    act(() => {
      view().chrome.editing?.onCellEdit?.(ROWS[1]!, "name", "Robert");
    });
    expect(onEdit).toHaveBeenLastCalledWith(ROWS[1], "name", "Robert");

    act(() => {
      view().chrome.editing?.dirty?.confirmAll();
    });
    expect(view().chrome.editing?.dirty?.count).toBe(0);
  });

  it("keeps the existing calls working unchanged", () => {
    expect(editHistory().apply?.({})).toEqual({ editHistory: true });
    expect(editHistory({ depth: 5 }).apply?.({})).toEqual({
      editHistory: { depth: 5 },
    });
    expect(cellNavigation().apply?.({})).toEqual({ cellNavigation: true });
  });
});
