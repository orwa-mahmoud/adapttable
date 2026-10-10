import type { ExportRequest, TreeShape } from "@adapttable/core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  type DataTableShellProps,
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
import { tree } from "./tree";

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

  it("asks about a batch cell the reader changed, and takes the rest", () => {
    const onBatchEdit = vi.fn();
    // The conflict pass only measures fields the host made editable.
    const editableColumns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
      {
        key: "budget",
        header: "Budget",
        accessor: (r) => r.budget,
        editable: true,
        editor: "number",
      },
    ];
    const changed: Row[] = [
      { id: "a", name: "Alice", budget: 99 },
      { id: "b", name: "Bob", budget: 30 },
    ];
    const feature = batchEditing<Row>(onBatchEdit);
    const withData = (data: Row[]) =>
      applyTableFeatures({
        features: [feature],
        data,
        columns: editableColumns,
        rowKey: (r: Row) => r.id,
        urlSync: false,
      });
    const before = withData(ROWS);
    const after = withData(changed);
    let view: DataTableShellResult<Row> | undefined;
    function Probe({ props }: { readonly props: typeof before }) {
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
    const { rerender } = render(
      <FeatureProviders props={before}>
        <Probe props={before} />
      </FeatureProviders>
    );

    act(() => {
      view?.chrome.editing?.batch?.setDraft(ROWS[0]!, "a", "budget", "55");
    });
    act(() => {
      rerender(
        <FeatureProviders props={after}>
          <Probe props={after} />
        </FeatureProviders>
      );
    });

    // Budget is the reader's, so the batch waits for an answer on that cell.
    const conflict = view?.chrome.editing?.conflict;
    expect(conflict?.contestedCell("a", "budget")).toEqual({
      incomingValue: "99",
    });
    expect(conflict?.anyContested).toBe(true);

    act(() => {
      conflict?.keepCell("a", "budget");
    });
    expect(view?.chrome.editing?.conflict?.anyContested).toBe(false);
    act(() => {
      view?.chrome.editing?.batch?.saveAll();
    });
    expect(onBatchEdit).toHaveBeenCalledWith([
      { row: changed[0], rowId: "a", patch: { budget: 55 } },
    ]);
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

interface TreeExportRow {
  id: string;
  name: string;
  children?: readonly TreeExportRow[];
  parent?: string;
}

it.each(["nested", "parent-id"] as const)(
  "exports off-page %s rows with current readers and retires removed trees",
  (kind) => {
    const firstChild: TreeExportRow = {
      id: "first-child",
      name: "First child",
      parent: "first",
    };
    const secondChild: TreeExportRow = {
      id: "second-child",
      name: "Second child",
      parent: "second",
    };
    const roots: readonly TreeExportRow[] = [
      { id: "first", name: "First", children: [firstChild] },
      { id: "second", name: "Second", children: [secondChild] },
    ];
    const data =
      kind === "nested" ? roots : [...roots, firstChild, secondChild];
    const request = vi.fn<(info: ExportRequest<TreeExportRow>) => void>();
    const exporter = exportCsv<TreeExportRow>({ scope: "all", request });
    let current: DataTableShellResult<TreeExportRow> | undefined;
    function Probe({ props }: { props: DataTableShellProps<TreeExportRow> }) {
      const shell = useDataTableShell(props, noForm);
      return (
        <DataTableShellView<TreeExportRow> shell={shell}>
          {(next) => {
            current = next;
            return null;
          }}
        </DataTableShellView>
      );
    }
    const table = (features: readonly TableFeature<TreeExportRow>[]) => {
      const props = applyTableFeatures({
        data,
        columns: [{ key: "name", accessor: (row: TreeExportRow) => row.name }],
        rowKey: (row: TreeExportRow) => row.id,
        defaults: { limit: 1 },
        features,
        urlSync: false,
      });
      return (
        <FeatureProviders props={props}>
          <Probe props={props} />
        </FeatureProviders>
      );
    };
    const initialShape: TreeShape<TreeExportRow> =
      kind === "nested"
        ? { getChildren: (row) => row.children }
        : { getParentId: (row) => row.parent };
    const result = render(table([tree<TreeExportRow>(initialShape), exporter]));
    const exportedIds = () =>
      request.mock.lastCall?.[0].rows.map((row) => row.id);
    const run = () => {
      act(() => current?.toolbarProps.onExportCsv?.());
    };
    try {
      expect(current?.chrome.source.rows.map((row) => row.id)).toEqual([
        "first",
      ]);
      const initialTree = current?.chrome.tree;
      expect(initialTree).toBeDefined();
      expect(initialTree?.getChildren).toBe(initialShape.getChildren);
      expect(initialTree?.getParentId).toBe(initialShape.getParentId);
      expect(Object.hasOwn(initialTree ?? {}, "getChildren")).toBe(
        kind === "nested"
      );
      expect(Object.hasOwn(initialTree ?? {}, "getParentId")).toBe(
        kind === "parent-id"
      );
      const runtimeEntries = initialTree?.allEntries;
      run();
      expect(exportedIds()).toEqual([
        "first",
        "first-child",
        "second",
        "second-child",
      ]);
      expect(current?.chrome.tree?.allEntries).toBe(runtimeEntries);
      const replacementShape: TreeShape<TreeExportRow> =
        kind === "nested"
          ? { getChildren: () => undefined }
          : { getParentId: () => undefined };
      result.rerender(table([tree<TreeExportRow>(replacementShape), exporter]));
      expect(current?.chrome.tree?.getChildren).toBe(
        replacementShape.getChildren
      );
      expect(current?.chrome.tree?.getParentId).toBe(
        replacementShape.getParentId
      );
      expect(initialTree?.getChildren).toBe(initialShape.getChildren);
      expect(initialTree?.getParentId).toBe(initialShape.getParentId);
      run();
      expect(exportedIds()).toEqual(data.map((row) => row.id));
      result.rerender(table([exporter]));
      expect(current?.chrome.tree).toBeUndefined();
      run();
      expect(exportedIds()).toEqual(data.map((row) => row.id));
      expect(request).toHaveBeenCalledTimes(3);
    } finally {
      result.unmount();
    }
  }
);
