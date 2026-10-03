/**
 * The standard preset — `@adapttable/angular-cdk/preset`.
 *
 * One import for the table most people want: every feature that is useful
 * with no configuration at all, drawn with this kit's own components. It is
 * assembled from the same public feature entries a caller would import by
 * hand, so nothing here is reachable only through the preset, and appending
 * or replacing an entry needs no escape hatch — the result is an ordinary
 * array.
 *
 * A feature that cannot work without input is NOT in the zero-argument list.
 * Grouping with no key, bulk actions with no actions and saved views with no
 * options are inert, and shipping an inert implementation is the cost this
 * whole architecture exists to avoid. Pass the option and the feature joins.
 *
 * Members that the React kits ship but this kit has not drawn yet
 * (`findInTable`, `fitColumns`, `multiSort`, `resizableColumns`) are omitted
 * until their secondary entries land — the list stays honest about what works.
 */
import type {
  AdaptTableFeature,
  BulkAction,
  FilterDef,
  SavedViewsControllerOptions,
} from "@adapttable/angular";
import { bulkActions } from "@adapttable/angular-cdk/bulk-actions";
import { columnMenu } from "@adapttable/angular-cdk/column-menu";
import { densityChooser } from "@adapttable/angular-cdk/density";
import { exportCsv } from "@adapttable/angular-cdk/export";
import { filters } from "@adapttable/angular-cdk/filters";
import { fullscreen } from "@adapttable/angular-cdk/fullscreen";
import { grouping } from "@adapttable/angular-cdk/grouping";
import { headerFilters } from "@adapttable/angular-cdk/header-filters";
import { savedViews } from "@adapttable/angular-cdk/saved-views";
import { statusBar } from "@adapttable/angular-cdk/status-bar";

/**
 * Options for configured members of the standard preset.
 *
 * @public
 */
export interface StandardPresetOptions<TRow> {
  /** Group rows by one key or a list of them. */
  readonly grouping?: string | readonly string[];
  /** Actions offered by the selection toolbar. */
  readonly bulkActions?: readonly BulkAction[];
  /** Declarative filter definitions. */
  readonly filters?: readonly FilterDef<TRow>[];
  /** Saved-view persistence and naming. */
  readonly savedViews?: SavedViewsControllerOptions;
}

/**
 * The features a good table has by default, drawn with this kit's controls.
 *
 * @public
 */
export function standardPreset<TRow>(
  options: StandardPresetOptions<TRow> = {}
): AdaptTableFeature[] {
  return [
    columnMenu(),
    densityChooser(),
    exportCsv(),
    fullscreen(),
    headerFilters(),
    statusBar(),
    ...(options.grouping === undefined ? [] : [grouping(options.grouping)]),
    ...(options.bulkActions === undefined
      ? []
      : [bulkActions(options.bulkActions)]),
    ...(options.filters === undefined ? [] : [filters(options.filters)]),
    ...(options.savedViews === undefined
      ? []
      : [savedViews(options.savedViews)]),
  ];
}
