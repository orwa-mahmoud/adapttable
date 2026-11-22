/**
 * The state each feature publishes under its own key, for the controls a kit
 * draws elsewhere in the table — a toolbar button reads its feature's key and
 * nothing the base names.
 */
import type { EditHistoryState } from "@adapttable/core";
import { featureStateKey } from "@adapttable/core/binding";

import type { ExportHandlerState } from "../export/useExportHandler";
import type { KitRegionProps } from "../kit/rootRegion";
import type { FullscreenState } from "../layout/useFullscreen";
import type { DataTableShellChromeProps } from "../shell/shellContract";

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
