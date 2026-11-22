/**
 * The state each feature publishes under its own key, for the controls a kit
 * draws elsewhere in the table — a toolbar button reads its feature's key and
 * nothing the base names.
 */
import type { ActiveFilterChip, EditHistoryState } from "@adapttable/core";
import { featureStateKey } from "@adapttable/core/binding";

import type { EditableCellEditing } from "../editing/editableCellController";
import type { ExportHandlerState } from "../export/useExportHandler";
import type { KitRegionProps } from "../kit/rootRegion";
import type { FullscreenState } from "../layout/useFullscreen";
import type { DataTableShellChromeProps } from "../shell/shellContract";

/**
 * The active filters' chips and count.
 *
 * @public
 */
export interface FilterChipsState {
  /** The removable chips: label-driven, the host's `extraChips`, the tree's. */
  readonly chips: readonly ActiveFilterChip[];
  /** The badge count: the host's override, or the chip count. */
  readonly activeFilterCount: number;
}

/** The active filters' chips, published by the filter-chips stage. */
export const FILTER_CHIPS_STATE =
  featureStateKey<FilterChipsState>("filter-chips");

/** The armed cell editing, published by the editing stage. */
export const EDITING_STATE =
  featureStateKey<EditableCellEditing<unknown>>("editing");

/** Undo and redo, published by the edit-history stage. */
export const EDIT_HISTORY_STATE =
  featureStateKey<EditHistoryState<unknown>>("edit-history");

/** The export control's state, published by the export stage. */
export const EXPORT_STATE = featureStateKey<ExportHandlerState>("export");

/** Fullscreen, published by the fullscreen stage. */
export const FULLSCREEN_STATE = featureStateKey<FullscreenState>("fullscreen");

/**
 * The table's finished props, features applied: what a feature's control
 * reads of the host's own options (the print callback, the density).
 */
export const TABLE_PROPS_STATE =
  featureStateKey<DataTableShellChromeProps<unknown>>("table-props");

/**
 * The composition's finished view and the table's props, for a toolbar entry
 * that builds its control from both (saved views, the column menu).
 */
export const TABLE_REGION_STATE =
  featureStateKey<KitRegionProps<unknown>>("table-region");
