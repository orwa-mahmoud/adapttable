/** A useful opt-in feature list with Reka controls in every interactive slot. */
import type {
  BulkAction,
  StaticTableFeature,
  TableFeature,
} from "@adapttable/vue";
import { standardFeatureList } from "@adapttable/vue/adapter";

import { bulkActions } from "./bulk-actions";
import { columnMenu } from "./column-menu";
import { densityChooser } from "./density";
import { exportCsv } from "./export-csv";
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

export interface StandardFeatureOptions<TRow> {
  readonly grouping?: string | readonly string[];
  readonly bulkActions?: readonly BulkAction[];
  readonly filters?: readonly FilterDef<TRow>[];
  readonly savedViews?: UseSavedViewsOptions;
  readonly findButton?: boolean;
}
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
export type { FilterDef, UseSavedViewsOptions } from "@adapttable/vue";
