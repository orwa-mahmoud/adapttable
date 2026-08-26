import { describe, expect, it, vi } from "vitest";

import {
  batchEditing,
  bulkActions,
  cellNavigation,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  commandPalette,
  contextMenu,
  densityChooser,
  dirtyIndicators,
  editHistory,
  editing,
  exportCsv,
  extraRows,
  feature,
  filters,
  filterTypes,
  findInTable,
  fitColumns,
  fullscreen,
  grouping,
  headerFilters,
  multiSort,
  nestedTable,
  print,
  resizableColumns,
  rowAppearance,
  rowDetail,
  rowEditing,
  rowPinning,
  rowReorder,
  savedViews,
  selectionStats,
  sidePanel,
  statusBar,
  tree,
  undoRedoButtons,
  virtualize,
} from "./factories";

function patch<T>(factory: { apply?: (input: object) => T }): T {
  const result = factory.apply?.({});
  if (result === undefined) throw new Error("factory produced no patch");
  return result;
}

describe("feature factories", () => {
  it("rowReorder writes onRowReorder", () => {
    const onRowReorder = vi.fn();
    expect(patch(rowReorder(onRowReorder))).toEqual({ onRowReorder });
  });

  it("rowPinning writes both pin channels", () => {
    const onPinnedRowIdsChange = vi.fn();
    expect(
      patch(
        rowPinning({
          pinnedRowIds: { top: ["a"], bottom: [] },
          onPinnedRowIdsChange,
        })
      )
    ).toEqual({
      pinnedRowIds: { top: ["a"], bottom: [] },
      onPinnedRowIdsChange,
    });
  });

  it("cellSpan writes the getter and appearance", () => {
    const getCellSpan = vi.fn();
    expect(patch(cellSpan(getCellSpan, "plain"))).toEqual({
      getCellSpan,
      cellSpanAppearance: "plain",
    });
  });

  it("extraRows writes the list", () => {
    const rows = [{ key: "sep", kind: "separator" as const, beforeRowId: "a" }];
    expect(patch(extraRows(rows))).toEqual({ extraRows: rows });
  });

  it("rowAppearance writes style hooks", () => {
    const rowClassName = vi.fn();
    expect(patch(rowAppearance({ rowClassName, rowHeight: 32 }))).toEqual({
      rowClassName,
      rowHeight: 32,
    });
  });

  it("rowDetail writes the renderer", () => {
    const renderRowDetail = vi.fn();
    expect(patch(rowDetail(renderRowDetail, ["a"]))).toEqual({
      renderRowDetail,
      defaultExpandedRowIds: ["a"],
    });
  });

  it("nestedTable writes nestedTable", () => {
    const nested = vi.fn();
    expect(patch(nestedTable(nested))).toEqual({ nestedTable: nested });
  });

  it("editing writes onCellEdit and extras", () => {
    const onCellEdit = vi.fn();
    expect(patch(editing(onCellEdit, { dirtyIndicators: true }))).toEqual({
      onCellEdit,
      dirtyIndicators: true,
    });
  });

  it("rowEditing arms the mode", () => {
    const onRowEdit = vi.fn();
    expect(patch(rowEditing(onRowEdit))).toEqual({
      rowEditing: true,
      onRowEdit,
    });
  });

  it("batchEditing arms the mode", () => {
    const onBatchEdit = vi.fn();
    expect(patch(batchEditing(onBatchEdit))).toEqual({
      batchEditing: true,
      onBatchEdit,
    });
  });

  it("editHistory defaults to true", () => {
    expect(patch(editHistory())).toEqual({ editHistory: true });
    expect(patch(editHistory({ depth: 10 }))).toEqual({
      editHistory: { depth: 10 },
    });
  });

  it("dirtyIndicators arms the mark", () => {
    expect(patch(dirtyIndicators())).toEqual({ dirtyIndicators: true });
  });

  it("grouping writes groupBy and extras", () => {
    expect(patch(grouping("team", { groupFooters: true }))).toEqual({
      groupBy: "team",
      groupFooters: true,
    });
  });

  it("tree writes the hierarchy accessors", () => {
    const getChildren = vi.fn();
    expect(patch(tree({ getChildren, treeColumn: "name" }))).toEqual({
      getChildren,
      treeColumn: "name",
    });
  });

  it("virtualize accepts a boolean or a config", () => {
    expect(patch(virtualize())).toEqual({ virtualize: true });
    expect(patch(virtualize(false))).toEqual({ virtualize: false });
    expect(
      patch(virtualize({ virtualizeColumns: true, estimateRowSize: 40 }))
    ).toEqual({
      virtualize: true,
      virtualizeColumns: true,
      estimateRowSize: 40,
    });
  });

  it("boolean chrome factories arm their prop", () => {
    expect(patch(columnMenu())).toEqual({ enableColumnMenu: true });
    expect(patch(resizableColumns())).toEqual({ resizableColumns: true });
    expect(patch(collapsibleColumnGroups())).toEqual({
      collapsibleColumnGroups: true,
    });
    expect(patch(cellNavigation())).toEqual({ cellNavigation: true });
    expect(patch(findInTable())).toEqual({ findInTable: true });
    expect(patch(fullscreen())).toEqual({ fullscreen: true });
    expect(patch(headerFilters())).toEqual({ headerFilters: true });
    expect(patch(selectionStats())).toEqual({ selectionStats: true });
    expect(patch(densityChooser())).toEqual({ densityChooser: true });
    expect(patch(statusBar())).toEqual({ statusBar: true });
    expect(patch(undoRedoButtons())).toEqual({ undoRedoButtons: true });
    expect(patch(multiSort())).toEqual({ multiSort: true });
    expect(patch(fitColumns())).toEqual({ fitColumns: true });
    expect(patch(columnSelectionCheckbox())).toEqual({
      columnSelectionCheckbox: true,
    });
  });

  it("exportCsv writes true or options", () => {
    expect(patch(exportCsv())).toEqual({ exportCsv: true });
    expect(patch(exportCsv({ filename: "x.csv" }))).toEqual({
      exportCsv: { filename: "x.csv" },
    });
  });

  it("commandPalette and contextMenu write true or options", () => {
    expect(patch(commandPalette())).toEqual({ commandPalette: true });
    expect(patch(commandPalette({ commands: [] }))).toEqual({
      commandPalette: { commands: [] },
    });
    expect(patch(contextMenu())).toEqual({ contextMenu: true });
  });

  it("sidePanel writes the dock options", () => {
    const options = {
      panels: [{ key: "x", label: "X", content: null }],
      open: null,
      onOpenChange: vi.fn(),
    };
    expect(patch(sidePanel(options))).toEqual({ sidePanel: options });
  });

  it("bulkActions writes the list", () => {
    const actions = [{ key: "del", label: "Delete", onClick: vi.fn() }];
    expect(patch(bulkActions(actions))).toEqual({ bulkActions: actions });
  });

  it("filters and filterTypes write the defs", () => {
    const defs = [{ key: "name", type: "text" as const, label: "Name" }];
    expect(patch(filters(defs))).toEqual({ filters: defs });
    const specs = [
      {
        type: "x",
        widget: "text" as const,
        ops: ["eq"],
        defaultOp: "eq",
        stateKeys: () => [],
        match: () => true,
        chips: () => ({}),
        conditionToExtra: () => ({}),
      },
    ];
    expect(patch(filterTypes(specs))).toEqual({ filterTypes: specs });
    expect(filterTypes(specs).setup).toEqual(expect.any(Function));
  });

  it("savedViews writes the options", () => {
    const options = { storageKey: "views" };
    expect(patch(savedViews(options))).toEqual({ savedViews: options });
  });

  it("print writes the handler and optional button", () => {
    const onPrint = vi.fn();
    expect(patch(print(onPrint))).toEqual({ onPrint, printButton: false });
    expect(patch(print(onPrint, true))).toEqual({ onPrint, printButton: true });
  });

  it("feature writes an ad-hoc patch under the given id", () => {
    const built = feature("audit", { statusBar: true });
    expect(built.id).toBe("audit");
    expect(patch(built)).toEqual({ statusBar: true });
  });

  it("registers extras through setup so a plugin is not a second API", () => {
    const writer = { extension: "tsv", build: vi.fn() };
    const registerWriter = vi.fn();
    exportCsv({ writer }).setup?.({ registerWriter } as never);
    expect(registerWriter).toHaveBeenCalledWith(writer);

    const commands = [{ key: "x", label: "X", onSelect: vi.fn() }];
    const registerCommand = vi.fn();
    commandPalette({ commands }).setup?.({ registerCommand } as never);
    expect(registerCommand).toHaveBeenCalledWith(commands[0]);

    const items = vi.fn(() => []);
    const registerContextMenuItems = vi.fn();
    contextMenu({ items }).setup?.({ registerContextMenuItems } as never);
    expect(registerContextMenuItems).toHaveBeenCalledWith(items);

    const panel = { key: "p", label: "P", content: null };
    const registerPanel = vi.fn();
    sidePanel({
      panels: [panel],
      open: null,
      onOpenChange: vi.fn(),
    }).setup?.({ registerPanel } as never);
    expect(registerPanel).toHaveBeenCalledWith(panel);
  });
});
