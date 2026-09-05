import type {
  BulkAction,
  ExportCsvOptions,
  FilterDef,
  FilterTypeSpec,
  RowAction,
} from "@adapttable/core";
import type {
  CommandPaletteOptions,
  ContextMenuOptions,
  NestedTableFor,
  SidePanelOptions,
} from "@adapttable/react";
import type {
  StaticTableFeature,
  TableFeature,
} from "@adapttable/react/features";

import { demoSavedViews, type Person } from "../data";
import type { KitFeatureRequests } from "../Demo";

/**
 * The kit factories every demo arms the same way.
 *
 * Each adapter publishes one entry point per feature, so the demo imports the
 * ones it shows and hands them here. Passing the factories rather than naming
 * a kit keeps this file honest: it cannot reach for an adapter the page did
 * not import, and a kit that renamed a factory fails to compile.
 */
export interface KitChromeFactories {
  cellNavigation: () => StaticTableFeature;
  columnSelectionCheckbox: () => StaticTableFeature;
  densityChooser: () => StaticTableFeature;
  editHistory: () => StaticTableFeature;
  exportCsv: <TRow>(
    options?: boolean | ExportCsvOptions<TRow>
  ) => TableFeature<TRow>;
  fullscreen: () => StaticTableFeature;
  headerFilters: () => StaticTableFeature;
  nestedTable: <TRow>(
    nested: NestedTableFor<TRow>,
    defaultExpandedRowIds?: readonly string[]
  ) => TableFeature<TRow>;
  print: (onPrint: () => void, printButton?: boolean) => StaticTableFeature;
  resizableColumns: () => StaticTableFeature;
  rowActions: <TRow>(
    actions?: readonly RowAction<TRow>[]
  ) => TableFeature<TRow>;
  savedViews: (
    options: ReturnType<typeof demoSavedViews>
  ) => StaticTableFeature;
  undoRedoButtons: () => StaticTableFeature;
  bulkActions: (actions: readonly BulkAction[]) => StaticTableFeature;
  collapsibleColumnGroups: () => StaticTableFeature;
  columnMenu: () => StaticTableFeature;
  commandPalette: (
    options?: boolean | CommandPaletteOptions
  ) => StaticTableFeature;
  contextMenu: <TRow>(
    options?: boolean | ContextMenuOptions<TRow>
  ) => TableFeature<TRow>;
  filters: <TRow>(defs: readonly FilterDef<TRow>[]) => TableFeature<TRow>;
  filterTypes: (specs: readonly FilterTypeSpec[]) => StaticTableFeature;
  findInTable: () => StaticTableFeature;
  selectionStats: () => StaticTableFeature;
  sidePanel: (options: SidePanelOptions) => StaticTableFeature;
  statusBar: () => StaticTableFeature;
  /**
   * The kit-drawn behaviours: grouping controls, an editor, a grip.
   *
   * Written against `Person` rather than a free row type — each takes a
   * row-typed handler, so a generic slot could not accept the kit's own
   * factory without erasing exactly the type the handler needs.
   */
  batchEditing: (
    onBatchEdit: NonNullable<KitFeatureRequests["batchEditing"]>
  ) => TableFeature<Person>;
  editing: (
    onCellEdit: NonNullable<KitFeatureRequests["editing"]>
  ) => TableFeature<Person>;
  groupingPanel: (
    groupBy: NonNullable<KitFeatureRequests["grouping"]>["groupBy"],
    extras: NonNullable<KitFeatureRequests["grouping"]>["extras"]
  ) => TableFeature<Person>;
  rowEditing: (
    onRowEdit: NonNullable<KitFeatureRequests["rowEditing"]>
  ) => TableFeature<Person>;
  rowReorder: (
    onRowReorder: NonNullable<KitFeatureRequests["rowReorder"]>["onRowReorder"],
    options: NonNullable<KitFeatureRequests["rowReorder"]>["options"]
  ) => TableFeature<Person>;
  tree: (
    options: NonNullable<KitFeatureRequests["tree"]>
  ) => TableFeature<Person>;
}

/** The demo switches that decide which of those a page shows. */
export interface KitChromeFlags {
  cellNavigation?: boolean;
  /** The footer strip. */
  statusBar?: boolean;
  columnSelectionCheckbox?: boolean;
  densityChooser?: boolean;
  editing?: boolean;
  exportCsv?: boolean | ExportCsvOptions<Person>;
  focused?: boolean;
  fullscreen?: boolean;
  headerFilters?: boolean;
  /** The nested-table definition, when the page shows one. */
  nested?: NestedTableFor<Person>;
  /** Which nested rows start open. */
  nestedOpenIds?: readonly string[];
  onPrint?: () => void;
  printButton?: boolean;
  undoRedoButtons?: boolean;
  urlKey?: string;
  /** Bulk actions are what turn row selection on. */
  bulkActions?: boolean;
  bulkActionList: readonly BulkAction[];
  /** Column groups collapse unless a page turned them off. */
  collapsibleColumnGroups?: boolean;
  columnMenu?: boolean;
  /** Whether this page draws the trailing row-actions column. */
  /** The trailing actions column, with the actions it offers. */
  rowActions?: readonly RowAction<Person>[];
  commandPalette?: boolean | CommandPaletteOptions;
  contextMenu?: boolean | ContextMenuOptions<Person>;
  /** The Filters control. */
  filterControls?: boolean;
  filterDefs: readonly FilterDef<Person>[];
  filterTypeSpecs: readonly FilterTypeSpec[];
  sidePanel?: SidePanelOptions;
  /** What the shared props builder asked this kit to draw. */
  kitFeatures?: KitFeatureRequests;
}

/**
 * Arm the chrome this page shows.
 *
 * The props on `<DataTable>` still CONFIGURE each one — which panels, which
 * label, which handler — but the import is what brings it, so a page that
 * shows no Columns menu never downloads one. That is the demo's whole claim,
 * made the same way a reader would make it.
 */
export function kitChromeFeatures(
  kit: KitChromeFactories,
  flags: KitChromeFlags
): readonly TableFeature<Person>[] {
  const rich = !flags.focused;
  return [
    ...(flags.cellNavigation || flags.editing || flags.urlKey === "live"
      ? [kit.cellNavigation()]
      : []),
    ...(flags.columnSelectionCheckbox ? [kit.columnSelectionCheckbox()] : []),
    ...(flags.densityChooser ? [kit.densityChooser()] : []),
    ...(flags.fullscreen ? [kit.fullscreen()] : []),
    ...(flags.onPrint ? [kit.print(flags.onPrint, flags.printButton)] : []),
    ...(flags.undoRedoButtons ? [kit.undoRedoButtons()] : []),
    ...(flags.editing ? [kit.editHistory()] : []),
    ...((flags.exportCsv ?? rich)
      ? [kit.exportCsv<Person>(flags.exportCsv ?? true)]
      : []),
    ...(rich ? [kit.savedViews(demoSavedViews(flags.urlKey))] : []),
    ...(flags.headerFilters ? [kit.headerFilters()] : []),
    ...(flags.nested
      ? [kit.nestedTable<Person>(flags.nested, flags.nestedOpenIds)]
      : []),
    kit.resizableColumns(),
    // Only when the page actually shows the trailing actions column: composing
    // it always would add a column, and every column index with it.
    ...(flags.rowActions ? [kit.rowActions<Person>(flags.rowActions)] : []),
    ...alwaysOn(kit, flags),
    ...panelChrome(kit, flags, rich),
    ...kitDrawn(kit, flags.kitFeatures ?? {}),
  ];
}

/**
 * The chrome a page asks for by prop, armed by the matching import.
 *
 * Only the two menus are unconditional: they answer a keystroke rather than
 * occupying the table, so a page that never opens one pays a factory call.
 * The rest follow their own switch — `selectionStats` in particular arms row
 * selection, and an always-on selection column would move every column after
 * it on pages that asked for none.
 */
function alwaysOn(
  kit: KitChromeFactories,
  flags: KitChromeFlags
): readonly TableFeature<Person>[] {
  return [
    ...(flags.statusBar ? [kit.statusBar()] : []),
    ...(flags.editing ? [kit.selectionStats()] : []),
    // Find is shareable URL state. The live demo is the page that syncs the
    // address bar, so the bar is on there even when editing is off.
    ...(flags.editing || flags.urlKey === "live" || flags.urlKey === "flt"
      ? [kit.findInTable()]
      : []),
    kit.commandPalette(flags.commandPalette ?? true),
    kit.contextMenu<Person>(flags.contextMenu ?? true),
  ];
}

/** The menus and panels a page shows unless it is a focused one. */
function panelChrome(
  kit: KitChromeFactories,
  flags: KitChromeFlags,
  rich: boolean
): readonly TableFeature<Person>[] {
  return [
    ...(flags.collapsibleColumnGroups ? [kit.collapsibleColumnGroups()] : []),
    ...((flags.columnMenu ?? rich) ? [kit.columnMenu()] : []),
    ...(flags.sidePanel ? [kit.sidePanel(flags.sidePanel)] : []),
    ...((flags.bulkActions ?? rich)
      ? [kit.bulkActions(flags.bulkActionList)]
      : []),
    ...((flags.filterControls ?? rich)
      ? [
          kit.filters<Person>(flags.filterDefs),
          kit.filterTypes(flags.filterTypeSpecs),
        ]
      : []),
  ];
}

/**
 * The behaviours only this kit can draw.
 *
 * Core owns what grouping, editing and reordering DO; each of these draws the
 * part the reader touches — grouping panel and headers, editor, grip — so the
 * demo has to reach for the kit's own factory, not core's.
 */
function kitDrawn(
  kit: KitChromeFactories,
  asked: KitFeatureRequests
): readonly TableFeature<Person>[] {
  return [
    ...(asked.editing ? [kit.editing(asked.editing)] : []),
    ...(asked.rowEditing ? [kit.rowEditing(asked.rowEditing)] : []),
    ...(asked.batchEditing ? [kit.batchEditing(asked.batchEditing)] : []),
    ...(asked.grouping
      ? [kit.groupingPanel(asked.grouping.groupBy, asked.grouping.extras)]
      : []),
    ...(asked.tree ? [kit.tree(asked.tree)] : []),
    ...(asked.rowReorder
      ? [
          kit.rowReorder(
            asked.rowReorder.onRowReorder,
            asked.rowReorder.options
          ),
        ]
      : []),
  ];
}
