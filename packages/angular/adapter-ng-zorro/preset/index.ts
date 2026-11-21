/**
 * The standard preset — `@adapttable/ng-zorro/preset`.
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
import { bulkActions } from "@adapttable/ng-zorro/bulk-actions";
import { columnMenu } from "@adapttable/ng-zorro/column-menu";
import { densityChooser } from "@adapttable/ng-zorro/density";
import { exportCsv } from "@adapttable/ng-zorro/export";
import { filters } from "@adapttable/ng-zorro/filters";
import { findInTable } from "@adapttable/ng-zorro/find-in-table";
import { fitColumns } from "@adapttable/ng-zorro/fit-columns";
import { fullscreen } from "@adapttable/ng-zorro/fullscreen";
import { grouping } from "@adapttable/ng-zorro/grouping";
import { headerFilters } from "@adapttable/ng-zorro/header-filters";
import { multiSort } from "@adapttable/ng-zorro/multi-sort";
import { resizableColumns } from "@adapttable/ng-zorro/resizable-columns";
import { savedViews } from "@adapttable/ng-zorro/saved-views";
import { statusBar } from "@adapttable/ng-zorro/status-bar";

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
