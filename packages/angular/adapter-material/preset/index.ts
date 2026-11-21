/**
 * The standard preset — `@adapttable/angular-material/preset`.
 *
 * One import for the table most people want: every feature that is useful
 * with no configuration at all, drawn with this kit's own components. It is
 * assembled from the same public feature entries a caller would import by
 * hand and from the column-layout and filtering families, so nothing here is
 * reachable only through the preset, and the result is an ordinary array.
 *
 * A feature that cannot work without input is NOT in the zero-argument list.
 * Grouping with no key, bulk actions with no actions and saved views with no
 * options are inert; pass the option and the feature joins.
 */
import type {
  AdaptTableFeature,
  BulkAction,
  FilterDef,
  SavedViewsControllerOptions,
} from "@adapttable/angular";
import { standardFeatureList } from "@adapttable/angular/adapter";
import { bulkActions } from "@adapttable/angular-material/bulk-actions";
import { columnMenu } from "@adapttable/angular-material/column-menu";
import { densityChooser } from "@adapttable/angular-material/density";
import { exportCsv } from "@adapttable/angular-material/export";
import { filters } from "@adapttable/angular-material/filters";
import { findInTable } from "@adapttable/angular-material/find-in-table";
import { fitColumns } from "@adapttable/angular-material/fit-columns";
import { fullscreen } from "@adapttable/angular-material/fullscreen";
import { grouping } from "@adapttable/angular-material/grouping";
import { headerFilters } from "@adapttable/angular-material/header-filters";
import { multiSort } from "@adapttable/angular-material/multi-sort";
import { resizableColumns } from "@adapttable/angular-material/resizable-columns";
import { savedViews } from "@adapttable/angular-material/saved-views";
import { statusBar } from "@adapttable/angular-material/status-bar";

/**
 * Options for the standard preset's configured members.
 *
 * @public
 */
export interface StandardFeatureOptions<TRow> {
  /** Group rows by one key or a list of them. */
  readonly grouping?: string | readonly string[];
  /** Actions offered by the selection toolbar. */
  readonly bulkActions?: readonly BulkAction[];
  /** Declarative filter definitions. */
  readonly filters?: readonly FilterDef<TRow>[];
  /** Saved-view persistence and naming. */
  readonly savedViews?: SavedViewsControllerOptions;
  /** Show Find in the toolbar; keyboard Find works without it. */
  readonly findButton?: boolean;
}

/**
 * The features a good table has by default, drawn with this kit's controls.
 *
 * @param options - Which configured members to add.
 * @returns The feature list.
 *
 * @public
 */
export function standardFeatures<TRow>(
  options: StandardFeatureOptions<TRow> = {}
): AdaptTableFeature[] {
  return standardFeatureList<
    AdaptTableFeature,
    BulkAction,
    FilterDef<TRow>,
    SavedViewsControllerOptions
  >(
    {
      columnMenu,
      densityChooser,
      exportCsv: () => exportCsv(),
      findInTable,
      fitColumns,
      fullscreen,
      headerFilters,
      multiSort,
      resizableColumns,
      statusBar,
      grouping: (groupBy) => grouping(groupBy),
      bulkActions,
      filters: (defs) => filters(defs),
      savedViews,
    },
    options
  );
}
