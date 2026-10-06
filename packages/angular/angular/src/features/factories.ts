/**
 * Built-in feature factories — one per optional behaviour, each over its
 * `core*` half, so an Angular table turns the same options into the same
 * configuration as every other binding. A kit extends one of these with the
 * components that fill its slots; a host plugin is the same type through
 * {@link feature}.
 */
import type { AdaptTableFeature } from "@adapttable/angular";
import type {
  BulkAction,
  CellSpanAppearance,
  Command,
  ContextMenuItem,
  ContextMenuTarget,
  ExtraRow,
  GetCellSpan,
  PinnedRows,
  RowHeight,
  RowStyle,
  SavedViewsControllerOptions,
  Shortcut,
} from "@adapttable/core";
import {
  coreBulkActions,
  coreCellSpan,
  coreCollapsibleColumnGroups,
  coreColumnMenu,
  coreColumnSelectionCheckbox,
  coreCommandPalette,
  coreContextMenu,
  coreExtraRows,
  coreFeature,
  coreFitColumns,
  coreHeaderFilters,
  coreMultiSort,
  corePinnedSummaryRows,
  corePrint,
  coreResizableColumns,
  coreRowAppearance,
  coreSavedViews,
  coreSidePanel,
  coreStatusBar,
  coreUndoRedoButtons,
  type FeaturePatch,
  type SidePanelEntry,
} from "@adapttable/core/binding";
import type { Signal, TemplateRef } from "@angular/core";

/**
 * Options for {@link commandPalette}.
 *
 * @public
 */
export interface CommandPaletteOptions {
  /**
   * Extra commands, appended after the built-in ones — the same objects the
   * context menus take, so an action is written once and offered in both.
   */
  readonly commands?: readonly Command[];
  /**
   * The shortcuts. Defaults to Cmd/Ctrl+K opening the palette; pass your own
   * to remap, or `[]` to bind nothing.
   */
  readonly shortcuts?: readonly Shortcut[];
  /** Draw a toolbar control that opens the palette. Off by default. */
  readonly button?: boolean;
  /**
   * Controlled open state. Pass a signal to update it after the feature is
   * created, and pair it with {@link CommandPaletteOptions.onOpenChange}.
   */
  readonly open?: boolean | Signal<boolean>;
  /** Told when the palette asks to open or close. */
  readonly onOpenChange?: (open: boolean) => void;
}

/**
 * Options for {@link contextMenu}.
 *
 * @public
 */
export interface ContextMenuOptions<TRow> {
  /**
   * Extra entries, appended behind a divider so a custom action is never
   * mistaken for a built-in one.
   */
  readonly items?: (
    target: ContextMenuTarget<TRow>
  ) => readonly ContextMenuItem[];
}

/**
 * One panel in {@link sidePanel}'s strip.
 *
 * @public
 */
export interface SidePanelPanel extends SidePanelEntry {
  /** The tab's caption. Falls back to the key. */
  readonly label?: string;
  /** What the panel shows: a template, or plain text. */
  readonly content?: TemplateRef<unknown> | string;
}

/**
 * Options for {@link sidePanel}.
 *
 * @public
 */
export interface SidePanelOptions {
  /** The panels, in tab order. */
  readonly panels: readonly SidePanelPanel[];
  /** Which panel is showing, or `null` when the panel is closed. */
  readonly open: string | null;
  /** Called with the panel to show, or `null` when it should close. */
  readonly onOpenChange: (key: string | null) => void;
  /**
   * Which edge to dock to. `"end"` (default) is the right in a left-to-right
   * table and the left in a right-to-left one.
   */
  readonly side?: "start" | "end";
}

/**
 * Class, style and height per row, for {@link rowAppearance}.
 *
 * @public
 */
export interface RowAppearanceOptions<TRow> {
  /** A class for each row. */
  readonly rowClassName?: (row: TRow, index: number) => string | undefined;
  /** Inline styles for each row. */
  readonly rowStyle?: RowStyle<TRow>;
  /** A fixed row height, or one per row. */
  readonly rowHeight?: RowHeight<TRow>;
}

/**
 * A host plugin or an ad-hoc patch, on the same surface as the built-ins.
 *
 * ```ts
 * features = [feature("audit-log", { statusBar: true }, (host) => …)];
 * ```
 *
 * @param id - The feature's stable id.
 * @param patch - The configuration it merges into the table.
 * @param setup - Registrations against the live table.
 * @returns The feature.
 *
 * @public
 */
export function feature(
  id: string,
  patch: FeaturePatch = {},
  setup?: AdaptTableFeature["setup"]
): AdaptTableFeature {
  const base: AdaptTableFeature = coreFeature(id, patch);
  return setup ? { ...base, setup } : base;
}

/**
 * Merge cells that share a value across rows or columns.
 *
 * @param getCellSpan - How far each cell spans.
 * @param cellSpanAppearance - How a merged cell looks.
 * @returns The feature.
 *
 * @public
 */
export function cellSpan<TRow>(
  getCellSpan: GetCellSpan<TRow>,
  cellSpanAppearance?: CellSpanAppearance
): AdaptTableFeature {
  return coreCellSpan(getCellSpan, cellSpanAppearance);
}

/**
 * Separator or full-width rows between the data rows. A full-width row's
 * `render` returns an `ng-template`, a standalone component, or text.
 *
 * @param rows - The rows and where each goes.
 * @returns The feature.
 *
 * @public
 */
export function extraRows(rows: readonly ExtraRow[]): AdaptTableFeature {
  return coreExtraRows(rows);
}

/**
 * Host-owned summary rows stuck above and below the body.
 *
 * @param pinnedRows - The rows above and below.
 * @returns The feature.
 *
 * @public
 */
export function pinnedSummaryRows<TRow>(
  pinnedRows: PinnedRows<TRow>
): AdaptTableFeature {
  return corePinnedSummaryRows(pinnedRows);
}

/**
 * Class, style and height per row.
 *
 * @param options - See {@link RowAppearanceOptions}.
 * @returns The feature.
 *
 * @public
 */
export function rowAppearance<TRow>(
  options: RowAppearanceOptions<TRow>
): AdaptTableFeature {
  return coreRowAppearance<unknown>({ ...options });
}

/**
 * The Columns menu: show, hide, reorder, pin, rename and auto-size columns.
 *
 * @returns The feature.
 *
 * @public
 */
export function columnMenu(): AdaptTableFeature {
  return coreColumnMenu();
}

/**
 * Columns resized by dragging their edge.
 *
 * @returns The feature.
 *
 * @public
 */
export function resizableColumns(): AdaptTableFeature {
  return coreResizableColumns();
}

/**
 * Grouped column headers that collapse to a summary.
 *
 * @returns The feature.
 *
 * @public
 */
export function collapsibleColumnGroups(): AdaptTableFeature {
  return coreCollapsibleColumnGroups();
}

/**
 * The command palette; its `commands` register on the table.
 *
 * @param options - `true`, or {@link CommandPaletteOptions}.
 * @returns The feature.
 *
 * @public
 */
export function commandPalette(
  options: boolean | CommandPaletteOptions = true
): AdaptTableFeature {
  return coreCommandPalette(options);
}

/**
 * Right-click menus on cells, rows and headers; their `items` register on
 * the table.
 *
 * @param options - `true`, or {@link ContextMenuOptions}.
 * @returns The feature.
 *
 * @public
 */
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): AdaptTableFeature {
  // An Angular feature is row-agnostic; the row type is checked here, at the
  // factory's signature, as grouping() does.
  return coreContextMenu<TRow>(options) as AdaptTableFeature;
}

/**
 * The side panel docked beside the table; its `panels` register on the
 * table.
 *
 * @param options - See {@link SidePanelOptions}.
 * @returns The feature.
 *
 * @public
 */
export function sidePanel(options: SidePanelOptions): AdaptTableFeature {
  return coreSidePanel(options);
}

/**
 * Actions that run against the selected rows.
 *
 * @param actions - The bulk actions.
 * @returns The feature.
 *
 * @public
 */
export function bulkActions(actions: readonly BulkAction[]): AdaptTableFeature {
  return coreBulkActions(actions);
}

/**
 * A filter control under each column header.
 *
 * @returns The feature.
 *
 * @public
 */
export function headerFilters(): AdaptTableFeature {
  return coreHeaderFilters();
}

/**
 * Saved, named and restored views.
 *
 * @param options - Where the views are kept.
 * @returns The feature.
 *
 * @public
 */
export function savedViews(
  options: SavedViewsControllerOptions
): AdaptTableFeature {
  return coreSavedViews(options);
}

/**
 * A print action that lays the table out for paper.
 *
 * @param onPrint - Runs the print.
 * @param printButton - Draw a toolbar button for it.
 * @returns The feature.
 *
 * @public
 */
export function print(
  onPrint: () => void,
  printButton = false
): AdaptTableFeature {
  return corePrint(onPrint, printButton);
}

/**
 * The status bar under the table.
 *
 * @returns The feature.
 *
 * @public
 */
export function statusBar(): AdaptTableFeature {
  return coreStatusBar();
}

/**
 * Undo and redo buttons for edits.
 *
 * @returns The feature.
 *
 * @public
 */
export function undoRedoButtons(): AdaptTableFeature {
  return coreUndoRedoButtons();
}

/**
 * Sorting by more than one column at a time.
 *
 * @returns The feature.
 *
 * @public
 */
export function multiSort(): AdaptTableFeature {
  return coreMultiSort();
}

/**
 * Columns sized to their content.
 *
 * @returns The feature.
 *
 * @public
 */
export function fitColumns(): AdaptTableFeature {
  return coreFitColumns();
}

/**
 * A checkbox in each column header that selects the column.
 *
 * @returns The feature.
 *
 * @public
 */
export function columnSelectionCheckbox(): AdaptTableFeature {
  return coreColumnSelectionCheckbox();
}
