/**
 * The toolbar region's props and the grouping panel's: the kit-agnostic slice
 * a kit's toolbar spreads before adding its own filters-mode wiring, menus and
 * colour. History, export and fullscreen start inert; the live gate overlays
 * them when their features are composed.
 */
import {
  type Direction,
  resolveFilterMode,
  toolbarShowsFilters,
} from "@adapttable/core";
import type { ReactNode } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import {
  printToolbar,
  undoRedoToolbar,
  viewControlsToolbar,
} from "../chrome/toolbarChrome";
import type { ExportHandlerState } from "../export/useExportHandler";
import type { FullscreenState } from "../layout/useFullscreen";
import type {
  DataTableShellChromeProps,
  DataTableShellGroupingPanelProps,
  DataTableShellProps,
  DataTableShellResult,
  DataTableShellToolbarProps,
} from "./shellContract";

/**
 * Build the toolbar region's props.
 *
 * @param props - The host's props.
 * @param chromeProps - The props the chrome was built from.
 * @param chrome - The shell's chrome.
 * @param filtersNode - The filters form the shell built.
 * @param history - The edit history, inert until its feature is composed.
 * @param exportHandler - The export handler, inert until its feature is.
 * @param fullscreen - The fullscreen state, inert until its feature is.
 * @returns The toolbar props a kit renders.
 */
export function shellToolbarProps<TRow>(
  props: DataTableShellProps<TRow>,
  chromeProps: DataTableShellChromeProps<TRow>,
  chrome: TableChrome<TRow>,
  filtersNode: ReactNode,
  history: DataTableShellResult<TRow>["editHistory"],
  exportHandler: ExportHandlerState,
  fullscreen: FullscreenState
): DataTableShellToolbarProps<TRow> {
  return {
    table: chrome.table,
    searchable: props.searchable !== false,
    searchPlaceholder: props.searchPlaceholder,
    sortByOptions: props.sortByOptions,
    toolbar: props.toolbar,
    toolbarSlots: props.toolbarSlots,
    ...undoRedoToolbar(props.undoRedoButtons, history, chrome.table.labels),
    ...printToolbar(props.printButton, props.onPrint, chrome.table.labels),
    ...viewControlsToolbar(chromeProps, fullscreen),
    hasFilters: toolbarShowsFilters(
      resolveFilterMode(props.filtersMode, props.headerFilters),
      Boolean(filtersNode),
      Boolean(chrome.table.source.setFilterTree)
    ),
    activeFilterCount: chrome.activeFilterCount,
    filters: filtersNode,
    onClearFilters: chrome.clearFilters,
    // Hidden in the grouped full-set view, where page size has no effect.
    // The body gate overlays the real sentinel; the shell starts inert.
    showRowsPerPage: false,
    onAddRow: chrome.rowMutations.canAdd
      ? chrome.rowMutations.addRow
      : undefined,
    addRowLabel: chrome.table.labels.addRow,
    ...exportHandler,
    dir: props.dir,
  };
}

/**
 * The grouping panel's props, when the grouping panel is composed.
 *
 * @param chrome - The shell's chrome.
 * @param dir - The table's direction.
 * @returns The panel props, or nothing without the panel.
 */
export function shellGroupingPanelProps<TRow>(
  chrome: TableChrome<TRow>,
  dir: Direction | undefined
): DataTableShellGroupingPanelProps<TRow> | undefined {
  return chrome.groupingPanel
    ? {
        state: chrome.groupingPanel,
        columns: chrome.allColumns,
        labels: chrome.table.labels,
        mobile: chrome.isMobile,
        dir,
      }
    : undefined;
}
