/**
 * The built-in feature factories: what each writes into the table, and what
 * its options register on the live table.
 */
import { createFeatureHost } from "@adapttable/core/binding";
import { signal } from "@angular/core";
import { describe, expect, it, vi } from "vitest";

import { type AdaptTableFeature, featureOptionsOf } from "../featureHost";
import { dirtyIndicators } from "./editing";
import {
  bulkActions,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  commandPalette,
  contextMenu,
  extraRows,
  feature,
  fitColumns,
  headerFilters,
  multiSort,
  pinnedSummaryRows,
  print,
  resizableColumns,
  rowAppearance,
  savedViews,
  sidePanel,
  statusBar,
  undoRedoButtons,
} from "./factories";

interface Row {
  id: string;
}

/** What a feature writes into the table's configuration. */
const patch = (built: AdaptTableFeature) => featureOptionsOf([built]);

describe("feature factories", () => {
  it("cellSpan writes the getter and appearance", () => {
    const getCellSpan = vi.fn();
    expect(patch(cellSpan<Row>(getCellSpan, "plain"))).toEqual(
      expect.objectContaining({ getCellSpan, cellSpanAppearance: "plain" })
    );
  });

  it("pinnedSummaryRows writes the host's rows", () => {
    const pinnedRows = { top: [{ id: "t" }], bottom: [{ id: "b" }] };
    expect(patch(pinnedSummaryRows<Row>(pinnedRows))).toEqual(
      expect.objectContaining({ pinnedRows })
    );
  });

  it("extraRows writes the list", () => {
    const rows = [{ key: "sep", kind: "separator" as const, beforeRowId: "a" }];
    expect(patch(extraRows(rows))).toEqual(
      expect.objectContaining({ extraRows: rows })
    );
  });

  it("rowAppearance writes the style hooks", () => {
    const rowClassName = vi.fn();
    expect(patch(rowAppearance<Row>({ rowClassName, rowHeight: 32 }))).toEqual({
      rowClassName,
      rowHeight: 32,
    });
  });

  it("dirtyIndicators arms the mark", () => {
    expect(patch(dirtyIndicators())).toEqual({ dirtyIndicators: true });
  });

  it("the switches arm their option", () => {
    expect(patch(columnMenu())).toEqual({ enableColumnMenu: true });
    expect(patch(resizableColumns())).toEqual(
      expect.objectContaining({ resizableColumns: true })
    );
    expect(patch(collapsibleColumnGroups())).toEqual({
      collapsibleColumnGroups: true,
    });
    expect(patch(headerFilters())).toEqual({ headerFilters: true });
    expect(patch(statusBar())).toEqual({ statusBar: true });
    expect(patch(undoRedoButtons())).toEqual({ undoRedoButtons: true });
    expect(patch(multiSort())).toEqual({ multiSort: true });
    expect(patch(fitColumns())).toEqual({ fitColumns: true });
    expect(patch(columnSelectionCheckbox())).toEqual({
      columnSelectionCheckbox: true,
    });
  });

  it("bulkActions and savedViews write their options", () => {
    const actions = [{ key: "del", label: "Delete", onClick: vi.fn() }];
    expect(patch(bulkActions(actions))).toEqual({ bulkActions: actions });
    const options = { storageKey: "views" };
    expect(patch(savedViews(options))).toEqual({ savedViews: options });
  });

  it("print writes the handler and the optional button", () => {
    const onPrint = vi.fn();
    expect(patch(print(onPrint))).toEqual({ onPrint, printButton: false });
    expect(patch(print(onPrint, true))).toEqual({ onPrint, printButton: true });
  });

  it("commandPalette writes its options and registers its commands", () => {
    expect(patch(commandPalette())).toEqual({ commandPalette: true });
    const command = { key: "audit", label: "Audit", onSelect: vi.fn() };
    const open = signal(false);
    const options = { commands: [command], open };
    const built = commandPalette(options);
    expect(patch(built)).toEqual({ commandPalette: options });
    expect(createFeatureHost([built]).commands).toEqual([command]);
  });

  it("contextMenu writes its options and registers its entries", () => {
    expect(patch(contextMenu())).toEqual({ contextMenu: true });
    const items = vi.fn(() => []);
    const built = contextMenu<Row>({ items });
    expect(createFeatureHost([built]).contextMenuItems).toEqual([items]);
  });

  it("sidePanel writes the dock options and registers each panel", () => {
    const options = {
      panels: [{ key: "notes" }, { key: "history" }],
      open: null,
      onOpenChange: vi.fn(),
    };
    const built = sidePanel(options);
    expect(patch(built)).toEqual({ sidePanel: options });
    expect(createFeatureHost([built]).panels).toEqual(options.panels);
  });

  it("feature writes an ad-hoc patch under its id, and carries a setup", () => {
    const plain = feature("audit", { statusBar: true });
    expect(plain.id).toBe("audit");
    expect(plain.setup).toBeUndefined();
    expect(patch(plain)).toEqual({ statusBar: true });

    const command = { key: "audit", label: "Audit", onSelect: vi.fn() };
    const withSetup = feature("audit", {}, (host) => {
      host.registerCommand(command);
    });
    expect(createFeatureHost([withSetup]).commands).toEqual([command]);
  });

  it("gives every built-in its own id", () => {
    const ids = [
      cellSpan<Row>(vi.fn()),
      extraRows([]),
      pinnedSummaryRows<Row>({}),
      rowAppearance<Row>({}),
      columnMenu(),
      resizableColumns(),
      collapsibleColumnGroups(),
      commandPalette(),
      contextMenu(),
      sidePanel({ panels: [], open: null, onOpenChange: vi.fn() }),
      bulkActions([]),
      headerFilters(),
      savedViews({ storageKey: "views" }),
      print(vi.fn()),
      statusBar(),
      undoRedoButtons(),
      multiSort(),
      fitColumns(),
      columnSelectionCheckbox(),
      dirtyIndicators(),
    ].map((built) => built.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(undefined);
  });
});
