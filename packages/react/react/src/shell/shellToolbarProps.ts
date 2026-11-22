/**
 * The toolbar region's props and the grouping panel's: the kit-agnostic slice
 * a kit's toolbar spreads before adding its own filters-mode wiring, menus and
 * colour. The controls the composed features add read their own state.
 */
import {
  type Direction,
  resolveFilterMode,
  toolbarShowsFilters,
} from "@adapttable/core";
import type { ReactNode } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import type {
  DataTableShellGroupingPanelProps,
  DataTableShellProps,
  DataTableShellToolbarProps,
} from "./shellContract";

/**
 * Build the toolbar region's props.
 *
 * @param props - The host's props.
 * @param chrome - The shell's chrome.
 * @param filtersNode - The filters form the shell built.
 * @returns The toolbar props a kit renders.
 */
export function shellToolbarProps<TRow>(
  props: DataTableShellProps<TRow>,
  chrome: TableChrome<TRow>,
  filtersNode: ReactNode
): DataTableShellToolbarProps<TRow> {
  return {
    table: chrome.table,
    searchable: props.searchable !== false,
    searchPlaceholder: props.searchPlaceholder,
    sortByOptions: props.sortByOptions,
    toolbar: props.toolbar,
    toolbarSlots: props.toolbarSlots,
    hasFilters: toolbarShowsFilters(
      resolveFilterMode(props.filtersMode, props.headerFilters),
      Boolean(filtersNode),
      Boolean(chrome.table.source.setFilterTree)
    ),
    filters: filtersNode,
    onClearFilters: chrome.clearFilters,
    // Hidden in the grouped full-set view, where page size has no effect.
    // The body gate overlays the real sentinel; the shell starts inert.
    showRowsPerPage: false,
    onAddRow: chrome.rowMutations.canAdd
      ? chrome.rowMutations.addRow
      : undefined,
    addRowLabel: chrome.table.labels.addRow,
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
