import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../types";
import {
  type DataTableShellResult,
  useDataTableShell,
} from "../useDataTableShell";
import { cellNavigation } from "./cell-navigation";
import { DataTableShellView } from "./chromeBodyGate";
import { editHistory } from "./edit-history";
import { batchEditing, editing } from "./editing";
import { exportCsv } from "./export-csv";
import { findInTable } from "./find-in-table";
import { fullscreen } from "./fullscreen";
import { FeatureProviders, FeatureSlot } from "./providers";
import { selectionStats } from "./selection-stats";
import { GRID_FOCUS_ANNOUNCER } from "./slotKeys";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

/**
 * The shell's live interaction hooks, mounted by the features that own them.
 *
 * Everything the shell hands an adapter — find, the keyboard grid, export,
 * fullscreen, the undo stack, selection figures — has two implementations: an
 * inert stand-in, and the real hook a composed feature mounts through its live
 * slot. This is the seam's central claim, so it is asserted from both sides:
 * the same table, composed and not, and the difference is the feature import.
 */
interface Row {
  id: string;
  name: string;
  budget: number;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice", budget: 10 },
  { id: "b", name: "Bob", budget: 30 },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "budget", header: "Budget", accessor: (r) => r.budget },
];

const noForm = () => null;

function mount(features: readonly TableFeature<Row>[]) {
  const props = applyTableFeatures({
    features,
    data: ROWS,
    columns,
    rowKey: (r: Row) => r.id,
    urlSync: false,
  });
  let view: DataTableShellResult<Row> | undefined;
  function Probe() {
    const shell = useDataTableShell(props, noForm);
    return (
      <DataTableShellView<Row> shell={shell}>
        {(next) => {
          view = next;
          return null;
        }}
      </DataTableShellView>
    );
  }
  render(
    <FeatureProviders props={props}>
      <Probe />
    </FeatureProviders>
  );
  return {
    get current(): DataTableShellResult<Row> {
      return view!;
    },
  };
}

describe("a table that composed none of the live features", () => {
  it("hands the adapter every stand-in, inert and safe to call", () => {
    const { current } = mount([]);

    expect(current.find.open).toBe(false);
    expect(current.gridFocus.enabled).toBe(false);
    expect(current.editHistory.enabled).toBe(false);
    expect(current.fullscreen.supported).toBe(false);
    expect(current.selectionStats).toBeNull();
    // No export handler means the toolbar draws no button at all.
    expect(current.toolbarProps.onExportCsv).toBeUndefined();
  });
});

describe("each live feature replaces its stand-in with the real hook", () => {
  it("findInTable opens a real find walk", () => {
    const view = mount([findInTable()]);

    expect(view.current.find.open).toBe(false);
    act(() => {
      view.current.find.setOpen(true);
      view.current.find.setQuery("Ali");
    });
    // The stub swallows both writes; the real hook keeps them and walks.
    expect(view.current.find.open).toBe(true);
    expect(view.current.find.query).toBe("Ali");
    expect(view.current.find.matches.length).toBeGreaterThan(0);
  });

  it("cellNavigation turns the table into a keyboard grid", () => {
    const view = mount([cellNavigation()]);

    expect(view.current.gridFocus.enabled).toBe(true);
    act(() => {
      view.current.gridFocus.focusCell({ row: 0, col: 1 });
    });
    expect(view.current.gridFocus.active).toEqual({ row: 0, col: 1 });
  });

  it("cellNavigation also brings the live region that says where focus went", () => {
    // A cell gaining DOM focus is announced as its contents alone. The column
    // it belongs to and its place in the dataset come from this region, which
    // the feature fills — an adapter renders the slot either way and gets
    // nothing without the import.
    const props = applyTableFeatures({
      features: [cellNavigation()],
      data: ROWS,
      columns,
      rowKey: (r: Row) => r.id,
      urlSync: false,
    });
    const focus = {
      enabled: true,
      announcement: "Budget, 30, row 2 of 2",
    } as never;
    render(
      <FeatureProviders props={props}>
        <FeatureSlot slot={GRID_FOCUS_ANNOUNCER} props={{ focus }} />
      </FeatureProviders>
    );

    expect(screen.getByText("Budget, 30, row 2 of 2")).toBeInTheDocument();
  });

  it("exportCsv gives the toolbar a handler to run", () => {
    const view = mount([exportCsv<Row>()]);

    expect(view.current.toolbarProps.onExportCsv).toBeTypeOf("function");
    expect(view.current.toolbarProps.exportBusy).toBe(false);
  });

  it("fullscreen reports what the document supports", () => {
    const view = mount([fullscreen()]);

    // jsdom implements no fullscreen API, so `supported` is the honest answer —
    // what matters is that the real hook, not the frozen stub, produced it.
    expect(view.current.fullscreen.toggle).toBeTypeOf("function");
    expect(view.current.fullscreen.active).toBe(false);
  });

  it("editHistory records an edit and can take it back", () => {
    const onCellEdit = vi.fn();
    const view = mount([
      editing<Row>(onCellEdit),
      editHistory(),
      cellNavigation(),
    ]);

    expect(view.current.editHistory.enabled).toBe(true);
    expect(view.current.editHistory.canUndo).toBe(false);
    act(() => {
      view.current.editHistory.record([
        { row: ROWS[0]!, columnKey: "name", value: "Alicia" },
      ]);
    });
    expect(view.current.editHistory.canUndo).toBe(true);

    // Undo replays the values the cells held before the gesture, through the
    // host's own commit channel — the table still writes nothing itself.
    let undone = 0;
    act(() => {
      undone = view.current.editHistory.undo();
    });
    expect(undone).toBe(1);
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], "name", "Alice");
    expect(view.current.editHistory.canRedo).toBe(true);
  });

  it("records a batch save as one undo gesture", () => {
    const onCellEdit = vi.fn();
    const onBatchEdit = vi.fn();
    const view = mount([
      editing<Row>(onCellEdit),
      batchEditing<Row>(onBatchEdit),
      editHistory(),
    ]);

    act(() => {
      view.current.chrome.editing?.batch?.setDraft(
        ROWS[0]!,
        "a",
        "budget",
        "99"
      );
    });
    act(() => {
      view.current.chrome.editing?.batch?.saveAll();
    });
    expect(onBatchEdit).toHaveBeenCalledOnce();
    expect(view.current.editHistory.canUndo).toBe(true);

    act(() => {
      view.current.editHistory.undo();
    });
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], "budget", 10);
  });

  it("selectionStats reports figures for a selected range", () => {
    const view = mount([cellNavigation(), selectionStats()]);

    act(() => {
      view.current.gridFocus.selectRange({
        anchor: { row: 0, col: 1 },
        head: { row: 1, col: 1 },
      });
    });
    expect(view.current.selectionStats?.cells).toBe(2);
    expect(view.current.selectionStats?.numeric).toBe(2);
    expect(view.current.selectionStats?.sum).toBe(40);
    expect(view.current.selectionStats?.average).toBe(20);
  });
});
