/**
 * The standard feature preset — which features, in which order.
 *
 * A kit's `standardFeatures()` is the same list in every binding: the
 * column-layout family and the other zero-configuration members in a fixed
 * order, then each configured member the caller named, the filtering family
 * when filters are given. The binding supplies the factories (its own,
 * drawing its own controls); this owns the list.
 */
import { columnLayoutFamilyList, filteringFamilyList } from "./featureFamilies";

/**
 * Options for the configured members of the standard preset.
 *
 * `TBulk`, `TFilter` and `TViews` are the binding's own option types.
 *
 * @public
 */
export interface CoreStandardFeatureOptions<TBulk, TFilter, TViews> {
  /** Group rows by one key or a list of them. */
  readonly grouping?: string | readonly string[];
  /** Actions offered by the selection toolbar. */
  readonly bulkActions?: readonly TBulk[];
  /** Declarative filter definitions. */
  readonly filters?: readonly TFilter[];
  /** Saved-view persistence and naming. */
  readonly savedViews?: TViews;
  /**
   * Draw the toolbar Find control. Off by default: find still opens from
   * Ctrl/Cmd+F inside the table and from a `?find=` link.
   */
  readonly findButton?: boolean;
}

/**
 * The factories the standard preset is assembled from, in the binding's
 * own feature type.
 *
 * @public
 */
export interface CoreStandardFeatureFactories<
  TFeature,
  TBulk,
  TFilter,
  TViews,
> {
  /** Columns menu. */
  readonly columnMenu: () => TFeature;
  /** Controlled density chooser. */
  readonly densityChooser: () => TFeature;
  /** CSV export control. */
  readonly exportCsv: () => TFeature;
  /** Find in table; `button` draws its toolbar control. */
  readonly findInTable: (options?: { readonly button?: boolean }) => TFeature;
  /** Fit-columns action. */
  readonly fitColumns: () => TFeature;
  /** Fullscreen control. */
  readonly fullscreen: () => TFeature;
  /** Header filter controls. */
  readonly headerFilters: () => TFeature;
  /** Multi-column sorting. */
  readonly multiSort: () => TFeature;
  /** Resizable columns. */
  readonly resizableColumns: () => TFeature;
  /** Status bar. */
  readonly statusBar: () => TFeature;
  /** Grouping configured by the preset option. */
  readonly grouping: (groupBy: string | readonly string[]) => TFeature;
  /** Selection bulk actions configured by the preset option. */
  readonly bulkActions: (actions: readonly TBulk[]) => TFeature;
  /** Declarative filters configured by the preset option. */
  readonly filters: (defs: readonly TFilter[]) => TFeature;
  /** Saved views configured by the preset option. */
  readonly savedViews: (options: TViews) => TFeature;
}

/**
 * The standard preset's members, in order.
 *
 * @param factories - The binding's factories.
 * @param options - Which configured members to add.
 * @returns The feature list.
 *
 * @public
 */
export function standardFeatureList<TFeature, TBulk, TFilter, TViews>(
  factories: CoreStandardFeatureFactories<TFeature, TBulk, TFilter, TViews>,
  options: CoreStandardFeatureOptions<TBulk, TFilter, TViews> = {}
): TFeature[] {
  return [
    ...columnLayoutFamilyList(factories),
    factories.densityChooser(),
    factories.exportCsv(),
    factories.findInTable(options.findButton === true ? { button: true } : {}),
    factories.fullscreen(),
    factories.multiSort(),
    factories.statusBar(),
    ...(options.grouping === undefined
      ? []
      : [factories.grouping(options.grouping)]),
    ...(options.bulkActions === undefined
      ? []
      : [factories.bulkActions(options.bulkActions)]),
    ...(options.filters === undefined
      ? [factories.headerFilters()]
      : filteringFamilyList(factories, options.filters)),
    ...(options.savedViews === undefined
      ? []
      : [factories.savedViews(options.savedViews)]),
  ];
}
