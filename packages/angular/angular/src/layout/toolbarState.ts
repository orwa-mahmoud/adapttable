/**
 * The state each toolbar control draws from, published by its feature.
 *
 * A feature publishes a signal of its control's state under its own key; the
 * control injects it, so the toolbar hands every entry only the labels and
 * the class map and names no feature.
 */
import type {
  SavedViewsControllerOptions,
  TableDensity,
  TableLabels,
} from "@adapttable/core";
import {
  type ColumnMenuSlotProps,
  type ExportHandlerState,
  type FeatureStateKey,
  featureStateKey,
  type SavedViewsSlotProps,
  type UndoRedoToolbarProps,
} from "@adapttable/core/binding";
import { computed, type Signal } from "@angular/core";

import { injectFeatureState } from "../featureState";

/**
 * What the density control draws from.
 *
 * @public
 */
export interface DensityToolbar {
  /** The density the table renders. */
  readonly density: TableDensity;
  /** Ask the table for another density. */
  readonly onDensityChange: (next: TableDensity) => void;
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
}

/**
 * What the fullscreen control draws from.
 *
 * @public
 */
export interface FullscreenToolbar {
  /** Enter or leave fullscreen; absent where the document cannot. */
  readonly onToggleFullscreen?: () => void;
  /** Whether the table is fullscreen. */
  readonly isFullscreen?: boolean;
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
}

/**
 * What the export control draws from.
 *
 * @public
 */
export interface ExportToolbar extends ExportHandlerState {
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
}

/**
 * What the print control draws from.
 *
 * @public
 */
export interface PrintToolbar {
  /** Print the table; absent unless the host asked for the button. */
  readonly onPrint?: () => void;
  /** The print control's caption. */
  readonly printLabel?: string;
}

/**
 * What the undo and redo controls draw from.
 *
 * @public
 */
export interface UndoRedoToolbar extends UndoRedoToolbarProps {
  /** The table's class map. */
  readonly classNames?: Readonly<Record<string, string | undefined>>;
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
}

/**
 * The density control's state, published by the table.
 *
 * @public
 */
export const DENSITY_TOOLBAR_STATE =
  featureStateKey<Signal<DensityToolbar>>("density-toolbar");

/**
 * The fullscreen control's state, published by the fullscreen feature.
 *
 * @public
 */
export const FULLSCREEN_TOOLBAR_STATE =
  featureStateKey<Signal<FullscreenToolbar>>("fullscreen-toolbar");

/**
 * The export control's state, published by the export feature.
 *
 * @public
 */
export const EXPORT_TOOLBAR_STATE =
  featureStateKey<Signal<ExportToolbar>>("export-toolbar");

/**
 * The print control's state, published by the print feature.
 *
 * @public
 */
export const PRINT_TOOLBAR_STATE =
  featureStateKey<Signal<PrintToolbar>>("print-toolbar");

/**
 * The undo and redo controls' state, published by the edit history.
 *
 * @public
 */
export const UNDO_REDO_TOOLBAR_STATE =
  featureStateKey<Signal<UndoRedoToolbar>>("undo-redo-toolbar");

/**
 * The saved-views menu's props, published while saved views are composed.
 *
 * @public
 */
export const SAVED_VIEWS_TOOLBAR_STATE = featureStateKey<
  Signal<SavedViewsSlotProps<SavedViewsControllerOptions>>
>("saved-views-toolbar");

/**
 * The Columns menu's props, published while the menu is composed; absent on
 * a phone.
 *
 * @public
 */
export const COLUMN_MENU_TOOLBAR_STATE = featureStateKey<
  Signal<ColumnMenuSlotProps<unknown> | undefined>
>("column-menu-toolbar");

function injectToolbar<T>(
  key: FeatureStateKey<Signal<T>>
): Signal<T | undefined> {
  const published = injectFeatureState(key);
  return computed(() => published()?.());
}

/**
 * The density control's state, from inside a table slot.
 *
 * @public
 */
export function injectDensityToolbar(): Signal<DensityToolbar | undefined> {
  return injectToolbar(DENSITY_TOOLBAR_STATE);
}

/**
 * The fullscreen control's state, from inside a table slot.
 *
 * @public
 */
export function injectFullscreenToolbar(): Signal<
  FullscreenToolbar | undefined
> {
  return injectToolbar(FULLSCREEN_TOOLBAR_STATE);
}

/**
 * The export control's state, from inside a table slot.
 *
 * @public
 */
export function injectExportToolbar(): Signal<ExportToolbar | undefined> {
  return injectToolbar(EXPORT_TOOLBAR_STATE);
}

/**
 * The print control's state, from inside a table slot.
 *
 * @public
 */
export function injectPrintToolbar(): Signal<PrintToolbar | undefined> {
  return injectToolbar(PRINT_TOOLBAR_STATE);
}

/**
 * The undo and redo controls' state, from inside a table slot.
 *
 * @public
 */
export function injectUndoRedoToolbar(): Signal<UndoRedoToolbar | undefined> {
  return injectToolbar(UNDO_REDO_TOOLBAR_STATE);
}
