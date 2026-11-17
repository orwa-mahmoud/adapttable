import { type BulkAction, type FilterDef } from "@adapttable/core";
import { standardFeatureList } from "@adapttable/core/binding";

import type {
  StaticTableFeature,
  TableFeature,
} from "../features/tableFeature";
import type { UseSavedViewsOptions } from "../url/useSavedViews";

/**
 * Options for configured members of a kit's standard feature preset.
 *
 * @public
 */
export interface StandardFeatureOptions<TRow> {
  /** Group rows by one key or a list of them. */
  readonly grouping?: string | readonly string[];
  /** Actions offered by the selection toolbar. */
  readonly bulkActions?: readonly BulkAction[];
  /**
   * Declarative filter definitions. A definition's `getValue` names the
   * preset's row type, as no table is there to supply it.
   */
  readonly filters?: readonly (FilterDef<TRow> & {
    readonly getValue?: (row: TRow) => unknown;
  })[];
  /** Saved-view persistence and naming. */
  readonly savedViews?: UseSavedViewsOptions;
  /**
   * Draw the toolbar Find control. Off by default: find still opens from
   * Ctrl/Cmd+F inside the table and from a `?find=` link.
   */
  readonly findButton?: boolean;
}

/**
 * The kit factories from which the standard preset is assembled.
 *
 * Every member remains an ordinary independently importable feature; this
 * object only centralizes the invariant order and option handling.
 *
 * @public
 */
export interface AdapterStandardFeatureFactories {
  /** Columns menu. */
  readonly columnMenu: () => StaticTableFeature;
  /** Controlled density chooser. */
  readonly densityChooser: () => StaticTableFeature;
  /** CSV export control. */
  readonly exportCsv: () => StaticTableFeature;
  /** Find in table; `button` draws its toolbar control. */
  readonly findInTable: (options?: {
    readonly button?: boolean;
  }) => StaticTableFeature;
  /** Fit-columns action. */
  readonly fitColumns: () => StaticTableFeature;
  /** Fullscreen control. */
  readonly fullscreen: () => StaticTableFeature;
  /** Header filter controls. */
  readonly headerFilters: () => StaticTableFeature;
  /** Multi-column sorting. */
  readonly multiSort: () => StaticTableFeature;
  /** Resizable columns. */
  readonly resizableColumns: () => StaticTableFeature;
  /** Status bar. */
  readonly statusBar: () => StaticTableFeature;
  /** Grouping configured by the preset option. */
  readonly grouping: (
    groupBy: string | readonly string[]
  ) => StaticTableFeature;
  /** Selection bulk actions configured by the preset option. */
  readonly bulkActions: (actions: readonly BulkAction[]) => StaticTableFeature;
  /** Declarative filters configured by the preset option. */
  readonly filters: <TRow>(
    defs: readonly FilterDef<TRow>[]
  ) => TableFeature<TRow>;
  /** Saved views configured by the preset option. */
  readonly savedViews: (options: UseSavedViewsOptions) => StaticTableFeature;
}

/**
 * The callable standard preset shared by all kit bindings.
 *
 * @public
 */
export interface StandardFeaturesFactory {
  /** Compose only zero-configuration members. */
  (): StaticTableFeature[];
  /** Compose zero-configuration and explicitly configured members. */
  <TRow>(options?: StandardFeatureOptions<TRow>): TableFeature<TRow>[];
}

/**
 * Build a kit's standard preset without coupling its visible implementations.
 *
 * @public
 */
export function createAdapterStandardFeatures(
  factories: AdapterStandardFeatureFactories
): StandardFeaturesFactory {
  return <TRow>(
    options: StandardFeatureOptions<TRow> = {}
  ): TableFeature<TRow>[] =>
    standardFeatureList<
      TableFeature<TRow>,
      BulkAction,
      FilterDef<TRow>,
      UseSavedViewsOptions
    >(factories, options);
}
