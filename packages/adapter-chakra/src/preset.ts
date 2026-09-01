/**
 * The standard preset — `@adapttable/chakra/preset`.
 *
 * One import for the table most people want: every feature that is useful
 * with no configuration at all, drawn with Chakra's own components. It is
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
 * Selection statistics is callable bare but still excluded: it needs a cell
 * range, which needs `cellNavigation`, while arming a row-selection column on
 * its own. Import it directly when you want it.
 *
 * Because this entry statically imports everything it can compose, its own
 * bundle contains the optional members whether or not you pass their options.
 * That is the trade the preset makes: one import instead of a list. A caller
 * counting every byte imports the individual features instead — see
 * `docs/features.md` for the measured difference.
 */
import type {
  BulkAction,
  FilterDef,
  StaticTableFeature,
  TableFeature,
  UseSavedViewsOptions,
} from "@adapttable/core";

import { bulkActions } from "./bulk-actions";
import { columnMenu } from "./column-menu";
import { densityChooser } from "./density";
import { exportCsv } from "./export";
import { filters } from "./filters";
import { findInTable } from "./find-in-table";
import { fitColumns } from "./fit-columns";
import { fullscreen } from "./fullscreen";
import { grouping } from "./grouping";
import { headerFilters } from "./header-filters";
import { multiSort } from "./multi-sort";
import { resizableColumns } from "./resizable-columns";
import { savedViews } from "./saved-views";
import { statusBar } from "./status-bar";

/**
 * What {@link standardFeatures} composes when you supply it.
 *
 * Each field is the argument the matching factory already takes, so learning
 * the preset teaches the individual import and not a second vocabulary.
 *
 * @public
 */
export interface StandardFeatureOptions<TRow> {
  /** Group rows by one key or a list of them. */
  grouping?: string | readonly string[];
  /** Actions the selection toolbar offers. */
  bulkActions?: readonly BulkAction[];
  /** Declarative filter definitions. */
  filters?: readonly FilterDef<TRow>[];
  /** Saved-views storage and naming. */
  savedViews?: UseSavedViewsOptions;
}

/**
 * The features a good table has by default, plus the ones you configure.
 *
 * ```tsx
 * import { standardFeatures } from "@adapttable/chakra/preset";
 *
 * <DataTable features={standardFeatures()} … />
 * <DataTable features={standardFeatures({ grouping: "team" })} … />
 * <DataTable features={[...standardFeatures(), myOwnFeature()]} … />
 * ```
 *
 * The array is yours: append to it, filter it, or replace an entry with your
 * own. Later entries win, so `[...standardFeatures(), columnMenu()]` is one
 * Columns menu, not two, and a duplicate id warns in development.
 *
 * @param options - Configuration for the members that need it. Omit one and
 *   its feature is not composed at all.
 * @returns The composed features, in a fresh array.
 *
 * @public
 */
export function standardFeatures(): StaticTableFeature[];
export function standardFeatures<TRow>(
  options?: StandardFeatureOptions<TRow>
): TableFeature<TRow>[];
export function standardFeatures<TRow>(
  options: StandardFeatureOptions<TRow> = {}
): TableFeature<TRow>[] {
  return [
    columnMenu(),
    densityChooser(),
    exportCsv(),
    findInTable(),
    fitColumns(),
    fullscreen(),
    headerFilters(),
    multiSort(),
    resizableColumns(),
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
