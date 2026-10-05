/** The standard native table, composed from the public individual features. */
import {
  type BulkAction,
  standardFeatureList,
  type StaticTableFeature,
  type TableFeature,
} from "@adapttable/vue/adapter";

import { bulkActions } from "./bulk-actions";
import { columnMenu } from "./column-menu";
import { densityChooser } from "./density";
import { exportCsv } from "./export";
import { type FilterDef, filters } from "./filters";
import { findInTable } from "./find-in-table";
import { fitColumns } from "./fit-columns";
import { fullscreen } from "./fullscreen";
import { grouping } from "./grouping";
import { headerFilters } from "./header-filters";
import { multiSort } from "./multi-sort";
import { resizableColumns } from "./resizable-columns";
import { savedViews, type UseSavedViewsOptions } from "./saved-views";
import { statusBar } from "./status-bar";

/** Only configured members join the useful zero-argument feature list. @public */
export interface StandardFeatureOptions<TRow> {
  /** Group rows by these column keys. */
  readonly grouping?: string | readonly string[];
  /** Host-owned actions offered for selected rows. */
  readonly bulkActions?: readonly BulkAction[];
  /** Typed declarative filter definitions. */
  readonly filters?: readonly FilterDef<TRow>[];
  /** Saved-view persistence and naming. */
  readonly savedViews?: UseSavedViewsOptions;
  /** Show Find in the toolbar; keyboard Find remains available without it. */
  readonly findButton?: boolean;
}

/** Compose native features; append a same-ID feature to replace its default. @public */
export function standardFeatures(): StaticTableFeature[];
export function standardFeatures<TRow>(
  options?: StandardFeatureOptions<TRow>
): TableFeature<TRow>[];
export function standardFeatures<TRow>(
  options: StandardFeatureOptions<TRow> = {}
): TableFeature<TRow>[] {
  return standardFeatureList<
    TableFeature<TRow>,
    BulkAction,
    FilterDef<TRow>,
    UseSavedViewsOptions
  >(
    {
      columnMenu,
      densityChooser,
      exportCsv,
      findInTable,
      fitColumns,
      fullscreen,
      headerFilters,
      multiSort,
      resizableColumns,
      statusBar,
      grouping,
      bulkActions,
      filters,
      savedViews,
    },
    options
  );
}
export type * from "@adapttable/vue/adapter";
export type { FilterDef } from "@adapttable/vue/filters";
export type { UseSavedViewsOptions } from "@adapttable/vue/saved-views";
