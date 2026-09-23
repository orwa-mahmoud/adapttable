import { act, render } from "@testing-library/react";
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

  it("keeps the existing calls working unchanged", () => {
    expect(editHistory().apply?.({})).toEqual({ editHistory: true });
    expect(editHistory({ depth: 5 }).apply?.({})).toEqual({
      editHistory: { depth: 5 },
    });
    expect(cellNavigation().apply?.({})).toEqual({ cellNavigation: true });
  });
});
