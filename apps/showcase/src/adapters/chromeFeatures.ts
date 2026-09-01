import type {
  BulkAction,
  CommandPaletteOptions,
  ContextMenuOptions,
  FilterDef,
  FilterTypeSpec,
  NestedTableFor,
  SidePanelOptions,
} from "@adapttable/core";
import type { TableFeature } from "@adapttable/core/features";

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
  cellNavigation: <TRow>() => TableFeature<TRow>;
  columnSelectionCheckbox: <TRow>() => TableFeature<TRow>;
  densityChooser: <TRow>() => TableFeature<TRow>;
  editHistory: <TRow>() => TableFeature<TRow>;
  exportCsv: <TRow>() => TableFeature<TRow>;
  fullscreen: <TRow>() => TableFeature<TRow>;
  headerFilters: <TRow>() => TableFeature<TRow>;
  nestedTable: <TRow>(nested: NestedTableFor<TRow>) => TableFeature<TRow>;
  print: <TRow>(
    onPrint: () => void,
    printButton?: boolean
  ) => TableFeature<TRow>;
  resizableColumns: <TRow>() => TableFeature<TRow>;
  rowActions: <TRow>() => TableFeature<TRow>;
  savedViews: <TRow>(
    options: ReturnType<typeof demoSavedViews>
  ) => TableFeature<TRow>;
  undoRedoButtons: <TRow>() => TableFeature<TRow>;
  bulkActions: <TRow>(actions: readonly BulkAction[]) => TableFeature<TRow>;
  collapsibleColumnGroups: <TRow>() => TableFeature<TRow>;
  columnMenu: <TRow>() => TableFeature<TRow>;
  commandPalette: <TRow>(
    options?: boolean | CommandPaletteOptions
  ) => TableFeature<TRow>;
  contextMenu: <TRow>(
    options?: boolean | ContextMenuOptions<TRow>
  ) => TableFeature<TRow>;
  filters: <TRow>(defs: readonly FilterDef<TRow>[]) => TableFeature<TRow>;
  filterTypes: <TRow>(specs: readonly FilterTypeSpec[]) => TableFeature<TRow>;
  findInTable: <TRow>() => TableFeature<TRow>;
  selectionStats: <TRow>() => TableFeature<TRow>;
  sidePanel: <TRow>(options: SidePanelOptions) => TableFeature<TRow>;
  statusBar: <TRow>() => TableFeature<TRow>;
  /**
   * The kit-drawn behaviours: a group header, an editor, a grip.
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
  grouping: (groupBy: readonly string[]) => TableFeature<Person>;
  rowEditing: (
    onRowEdit: NonNullable<KitFeatureRequests["rowEditing"]>
  ) => TableFeature<Person>;
  rowReorder: (
    onRowReorder: NonNullable<KitFeatureRequests["rowReorder"]>
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
  exportCsv?: unknown;
  focused?: boolean;
  fullscreen?: boolean;
  headerFilters?: boolean;
  /** The nested-table definition, when the page shows one. */
  nested?: NestedTableFor<Person>;
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
  rowActions?: boolean;
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
    ...((flags.cellNavigation ?? flags.editing)
      ? [kit.cellNavigation<Person>()]
      : []),
    ...(flags.columnSelectionCheckbox
      ? [kit.columnSelectionCheckbox<Person>()]
      : []),
    ...(flags.densityChooser ? [kit.densityChooser<Person>()] : []),
    ...(flags.fullscreen ? [kit.fullscreen<Person>()] : []),
    ...(flags.onPrint
      ? [kit.print<Person>(flags.onPrint, flags.printButton)]
      : []),
    ...(flags.undoRedoButtons ? [kit.undoRedoButtons<Person>()] : []),
    ...(flags.editing ? [kit.editHistory<Person>()] : []),
    ...((flags.exportCsv ?? rich) ? [kit.exportCsv<Person>()] : []),
    ...(rich ? [kit.savedViews<Person>(demoSavedViews(flags.urlKey))] : []),
    ...(flags.headerFilters ? [kit.headerFilters<Person>()] : []),
    ...(flags.nested ? [kit.nestedTable<Person>(flags.nested)] : []),
    kit.resizableColumns<Person>(),
    // Only when the page actually shows the trailing actions column: composing
    // it always would add a column, and every column index with it.
    ...(flags.rowActions ? [kit.rowActions<Person>()] : []),
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
    ...(flags.statusBar ? [kit.statusBar<Person>()] : []),
    ...(flags.editing
      ? [kit.selectionStats<Person>(), kit.findInTable<Person>()]
      : []),
    kit.commandPalette<Person>(flags.commandPalette ?? true),
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
    ...(flags.collapsibleColumnGroups
      ? [kit.collapsibleColumnGroups<Person>()]
      : []),
    ...((flags.columnMenu ?? rich) ? [kit.columnMenu<Person>()] : []),
    ...(flags.sidePanel ? [kit.sidePanel<Person>(flags.sidePanel)] : []),
    ...((flags.bulkActions ?? rich)
      ? [kit.bulkActions<Person>(flags.bulkActionList)]
      : []),
    ...((flags.filterControls ?? rich)
      ? [
          kit.filters<Person>(flags.filterDefs),
          kit.filterTypes<Person>(flags.filterTypeSpecs),
        ]
      : []),
  ];
}

/**
 * The behaviours only this kit can draw.
 *
 * Core owns what grouping, editing and reordering DO; each of these draws the
 * part the reader touches — a group header, an editor, a grip — so the demo
 * has to reach for the kit's own factory, not core's.
 */
function kitDrawn(
  kit: KitChromeFactories,
  asked: KitFeatureRequests
): readonly TableFeature<Person>[] {
  return [
    ...(asked.editing ? [kit.editing(asked.editing)] : []),
    ...(asked.rowEditing ? [kit.rowEditing(asked.rowEditing)] : []),
    ...(asked.batchEditing ? [kit.batchEditing(asked.batchEditing)] : []),
    ...(asked.grouping ? [kit.grouping(asked.grouping)] : []),
    ...(asked.tree ? [kit.tree(asked.tree)] : []),
    ...(asked.rowReorder ? [kit.rowReorder(asked.rowReorder)] : []),
  ];
}
