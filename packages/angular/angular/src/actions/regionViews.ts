/**
 * The command palette's and the context menu's slot props. A kit's palette
 * and menu features hand these builders to the table, so a table that
 * composes neither carries none of this code.
 */
import {
  type AdaptTableFeature,
  type ColumnDef,
  type DataTable,
  type GridFocus,
  withFeatureImplementation,
} from "@adapttable/angular";
import type {
  CellRange,
  ContextMenuTarget,
  Direction,
  RowAction,
  TableLabels,
} from "@adapttable/core";
import { copyContextMenuSelection } from "@adapttable/core/binding";
import { computed, type Signal } from "@angular/core";

import type { FiltersView } from "../filters/tableFilters";
import type { CommandPaletteInjectOptions } from "./commandPalette";
import { COMMAND_PALETTE_VIEW, CONTEXT_MENU_VIEW } from "./regionViewKeys";
import type { TableContextMenuOptions } from "./tableContextMenu";

/** What {@link contextMenuView} builds the menu's props from. */
export interface ContextMenuViewInput<TRow> {
  readonly contextMenu: TableContextMenuOptions<TRow>["contextMenu"];
  readonly table: DataTable<TRow>;
  readonly pinning:
    | Signal<{ readonly actions: readonly RowAction<TRow>[] } | undefined>
    | undefined;
  readonly grid: GridFocus<TRow> | undefined;
  readonly filters: FiltersView | undefined;
  readonly rowKey: (row: TRow) => string;
  readonly onCellCut: Signal<((range: CellRange) => void) | undefined>;
}

/** The menu slot's props, with the handlers the built-in entries call. */
export type ContextMenuView<TRow> = Signal<
  TableContextMenuOptions<TRow> & {
    readonly children: (regionProps: Record<string, unknown>) => undefined;
  }
>;

/** Copy or cut the cell the menu was opened on, once cell navigation is on. */
function menuCopy<TRow>(
  grid: GridFocus<TRow> | undefined,
  target: ContextMenuTarget<TRow>,
  cut?: boolean
): void {
  if (!grid) return;
  copyContextMenuSelection(
    { range: grid.range(), cellAt: grid.cellAt, copyCells: grid.copyCells },
    target,
    cut
  );
}

/** The menu slot's props, including the handlers the built-in entries call. */
export function contextMenuView<TRow>(
  input: ContextMenuViewInput<TRow>
): ContextMenuView<TRow> {
  const { table, grid, filters } = input;
  const options = contextMenuOptionsFor({
    contextMenu: input.contextMenu,
    columns: table.columns,
    labels: table.labels,
    rowFor: (rowId) =>
      table.source().rows.find((row) => input.rowKey(row) === rowId),
    sortBy: table.sortBy,
    sortDir: table.sortDir,
    isPinned: (columnKey) =>
      table.layout().state.pinned[columnKey] !== undefined,
    rowPins: computed(() => input.pinning?.()?.actions ?? []),
    featureHost: table.featureHost,
    gridNavigation: grid !== undefined,
    onSort: (columnKey, direction) => {
      table.source().setSort(columnKey, direction);
    },
    onHide: (columnKey) => {
      table.layout().toggleVisible(columnKey);
    },
    onFilter: filters ? () => filters.show() : undefined,
    onCopy: (target) => menuCopy(grid, target),
    cut: computed(() => grid !== undefined && input.onCellCut() !== undefined),
    onCut: (target) => menuCopy(grid, target, true),
  });
  // The slot type requires `children` for the React root wrapper. Angular
  // binds the region handlers on the table root instead.
  return computed(() => ({ ...options(), children: () => undefined }));
}

/** Props for the context-menu slot. */
function contextMenuOptionsFor<TRow>(options: {
  readonly contextMenu: TableContextMenuOptions<TRow>["contextMenu"];
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  readonly labels: Signal<TableLabels>;
  readonly rowFor: (rowId: string) => TRow | undefined;
  readonly sortBy: Signal<string | undefined>;
  readonly sortDir: Signal<"asc" | "desc" | undefined>;
  readonly isPinned: (columnKey: string) => boolean;
  readonly rowPins: Signal<readonly RowAction<TRow>[]>;
  readonly featureHost: TableContextMenuOptions<TRow>["featureHost"];
  readonly gridNavigation: boolean;
  readonly onSort: (columnKey: string, direction: "asc" | "desc") => void;
  readonly onHide: (columnKey: string) => void;
  readonly onFilter: (() => void) | undefined;
  readonly onCopy: (target: ContextMenuTarget<TRow>) => void;
  readonly cut: Signal<boolean>;
  readonly onCut: (target: ContextMenuTarget<TRow>) => void;
}): Signal<TableContextMenuOptions<TRow>> {
  return computed(() => ({
    contextMenu: options.contextMenu,
    columns: options.columns(),
    labels: options.labels(),
    rowFor: options.rowFor,
    actions: {
      onCopy: options.onCopy,
      onCut: options.cut() ? options.onCut : undefined,
      onSort: options.onSort,
      onHide: options.onHide,
      onFilter: options.onFilter,
    },
    sortBy: options.sortBy(),
    sortDir: options.sortDir(),
    isPinned: options.isPinned,
    rowPins: options.rowPins(),
    featureHost: options.featureHost,
    gridNavigation: options.gridNavigation,
  }));
}

/** What {@link commandPaletteView} builds the palette's props from. */
export interface CommandPaletteViewInput {
  readonly commandPalette: CommandPaletteInjectOptions["commandPalette"];
  readonly onPrint: CommandPaletteInjectOptions["onPrint"];
  readonly labels: Signal<TableLabels>;
  readonly dir: Signal<Direction>;
  readonly clearFilters: () => void;
  readonly featureHost: CommandPaletteInjectOptions["featureHost"];
  readonly exportCsv:
    | Signal<
        | {
            readonly onExportCsv?: () => void;
            readonly exportLabel?: string;
          }
        | undefined
      >
    | undefined;
  readonly filterCount: Signal<number>;
}

/**
 * The command palette's slot props, built while the palette is composed.
 *
 * @param options - What the props read.
 * @returns The props as a signal.
 */
export function commandPaletteView(
  options: CommandPaletteViewInput
): Signal<CommandPaletteInjectOptions> {
  return computed(() => {
    const exported = options.exportCsv?.();
    return {
      commandPalette: options.commandPalette,
      labels: options.labels(),
      dir: options.dir(),
      onPrint: options.onPrint,
      onExport: exported?.onExportCsv,
      exportLabel: exported?.exportLabel,
      onClearFilters: options.clearFilters,
      hasFilters: options.filterCount() > 0,
      featureHost: options.featureHost,
    };
  });
}

/**
 * A command-palette feature that brings the code building its slot props.
 * A kit wraps the binding's `commandPalette()` with this beside its
 * `COMMAND_PALETTE_LIVE` fill.
 *
 * @param feature - The palette feature.
 * @returns The feature, carrying its props' builder.
 *
 * @public
 */
export function withCommandPaletteView(
  feature: AdaptTableFeature
): AdaptTableFeature {
  return withFeatureImplementation(
    feature,
    COMMAND_PALETTE_VIEW,
    commandPaletteView
  );
}

/**
 * A context-menu feature that brings the code building its slot props.
 * A kit wraps the binding's `contextMenu()` with this beside its
 * `CONTEXT_MENU_LIVE` fill.
 *
 * @param feature - The menu feature.
 * @returns The feature, carrying its props' builder.
 *
 * @public
 */
export function withContextMenuView(
  feature: AdaptTableFeature
): AdaptTableFeature {
  return withFeatureImplementation(feature, CONTEXT_MENU_VIEW, contextMenuView);
}
