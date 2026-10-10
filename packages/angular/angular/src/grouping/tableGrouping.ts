import {
  type AdaptTableFeature,
  type DataTable,
  featureOptionsOf,
  injectGroupCollapse,
  injectGroupPaging,
  type MaybeSignalOptional,
  readMaybe,
} from "@adapttable/angular";
import type { GroupingExtras } from "@adapttable/angular/features";
import {
  declaredAggregates,
  devWarn,
  type ExtraRow,
  formatGroupBy,
  type GroupAggregatesFn,
  type GroupByInput,
  type GroupedFlatEntry,
  groupedRowModel,
  groupingAggregates,
  groupingIgnoredWarning,
  type GroupingRuntimeSource,
  groupShowMoreRequest,
  parseGroupBy,
  type TableSource,
} from "@adapttable/core";
import { type GroupCollapseState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

/**
 * The grouped table a kit renders: its keys, collapse state and flat
 * entries, and the actions that change them.
 *
 * @public
 */
export interface TableGrouping<TRow> {
  /** The grouping keys in order — one for a flat group, more for nested. */
  readonly groupBy: readonly string[];
  /** Which groups are closed. */
  readonly collapsed: GroupCollapseState;
  /** The per-group subtotals, with the reader's overrides applied. */
  readonly aggregates: GroupAggregatesFn<TRow> | undefined;
  /** Group headers, footers, "show more" rows, leaves and extras, in order. */
  readonly entries: readonly GroupedFlatEntry<TRow>[];
  /** Change the grouping keys. */
  readonly setGroupBy: (key: GroupByInput) => void;
  /** Open every group. */
  readonly expandAll: () => void;
  /** Close every group, at every level. */
  readonly collapseAll: () => void;
  /** Show the tree down to `depth`: `0` leaves only the outermost headers. */
  readonly collapseToDepth: (depth: number) => void;
  /** Reveal the next page of groups, or of one group's rows. */
  readonly showMore: (entry: {
    scope: "groups" | "rows";
    groupKey?: string;
  }) => void;
}

/**
 * Options for {@link injectGrouping}.
 *
 * @public
 */
export interface GroupingOptions<TRow> {
  /** The headless table: its columns and row identity. */
  readonly table: Pick<DataTable<TRow>, "allColumns" | "rowKey">;
  /** The live source, before grouping widens it. */
  readonly source: Signal<TableSource<TRow>>;
  /** The composed features; grouping arms on `grouping` or `groupingPanel`. */
  readonly features: readonly AdaptTableFeature[];
  /** Active locale, for a grouped column's `i18n` path. */
  readonly locale?: MaybeSignalOptional<string>;
  /** The injector to run in. */
  readonly injector?: Injector;
}

/** The grouping panel feature's own extras, for its declared aggregates. */
interface PanelFeature extends AdaptTableFeature {
  readonly extras?: { readonly groupAggregates?: unknown };
}

/**
 * The live grouped model while `grouping()` or `groupingPanel()` is composed,
 * `undefined` when neither is. The signal holds `undefined` while nothing
 * groups — no keys, or a source that cannot group.
 *
 * Render from `groupedViewSource(source)` while the signal holds a model: a
 * group spans pages, so the grouped table shows the full filtered set.
 *
 * @param options - See {@link GroupingOptions}.
 * @returns The model as a signal, or `undefined` when grouping is not composed.
 *
 * @public
 */
export function injectGrouping<TRow>(
  options: GroupingOptions<TRow>
): Signal<TableGrouping<TRow> | undefined> | undefined {
  const { features, table } = options;
  const panel = features.find(
    (feature): feature is PanelFeature => feature.id === "grouping-panel"
  );
  const armed =
    panel !== undefined || features.some((f) => f.id === "grouping");
  if (!armed) return undefined;
  if (!options.injector) assertInInjectionContext(injectGrouping);
  const injector = options.injector ?? inject(Injector);

  const extras = featureOptionsOf(features) as GroupingExtras<TRow> & {
    readonly groupBy?: string | readonly string[];
    readonly extraRows?: readonly ExtraRow[];
  };
  const panelDeclared = declaredAggregates(panel?.extras?.groupAggregates);
  const collapse = injectGroupCollapse({
    collapsedGroupIds: extras.collapsedGroupIds,
    onCollapsedGroupIdsChange: extras.onCollapsedGroupIdsChange,
    injector,
  });
  const paging = injectGroupPaging({ injector });

  const groupByKeys = computed(
    () => parseGroupBy(extras.groupBy ?? options.source().groupBy),
    { equal: sameKeys }
  );
  // Only the fields grouping reads, so a page or a search does not rebuild
  // the grouped model.
  const groupingSource = computed(
    (): GroupingRuntimeSource<TRow> => {
      const source = options.source();
      return {
        allFilteredRows: source.allFilteredRows,
        groups: source.groups,
        capabilities: source.capabilities,
        honorsAggregates: source.honorsAggregates,
        aggregateOperations: source.aggregateOperations,
        groupAggregateOverrides: source.groupAggregateOverrides,
        queryAggregates: source.queryAggregates,
        groupAggregations: source.groupAggregations,
      };
    },
    { equal: sameFields }
  );

  effect(
    () => {
      const warning = groupingIgnoredWarning(groupByKeys(), groupingSource());
      if (warning !== undefined) devWarn(warning);
    },
    { injector }
  );

  const setGroupBy = (key: GroupByInput): void => {
    options.source().setGroupBy(formatGroupBy(key));
    extras.onGroupByChange?.(parseGroupBy(key));
  };
  const aggregates = computed(() =>
    groupingAggregates({
      source: groupingSource(),
      columns: table.allColumns(),
      groupAggregates: extras.groupAggregates,
      panelDeclared,
    })
  );

  return computed((): TableGrouping<TRow> | undefined => {
    const collapsed = collapse();
    const pagingState = paging();
    const model = groupedRowModel({
      groupByKeys: groupByKeys(),
      source: groupingSource(),
      columns: table.allColumns(),
      locale: options.locale && readMaybe(options.locale),
      getRowId: (row) => table.rowKey(row),
      collapsedGroupIds: collapsed.collapsedGroupIds,
      aggregates: aggregates(),
      groupFooters: extras.groupFooters,
      groupSort: extras.groupSort,
      groupFilter: extras.groupFilter,
      groupPageSize: extras.groupPageSize,
      groupRowPageSize: extras.groupRowPageSize,
      paging: pagingState.paging,
      extraRows: extras.extraRows,
    });
    if (!model) return undefined;
    const { openGroups } = model;
    return {
      groupBy: groupByKeys(),
      collapsed,
      aggregates: aggregates().aggregates,
      entries: model.entries,
      setGroupBy,
      showMore: (entry) => {
        const request = groupShowMoreRequest(entry, {
          groupPageSize: extras.groupPageSize,
          groupRowPageSize: extras.groupRowPageSize,
        });
        pagingState.showMore(request.pageSize, request.groupKey);
        if (request.loadMoreKey !== undefined) {
          extras.onGroupLoadMore?.(request.loadMoreKey);
        }
      },
      expandAll: collapsed.expandAll,
      collapseAll: () => {
        collapsed.collapseToDepth(0, openGroups);
      },
      collapseToDepth: (depth) => {
        collapsed.collapseToDepth(depth, openGroups);
      },
    };
  });
}

/** Whether two key lists name the same keys in the same order. */
function sameKeys(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((key, index) => key === right[index])
  );
}

/** Whether two records hold the same value under every key. */
function sameFields(left: object, right: object): boolean {
  const leftRecord = left as Readonly<Record<string, unknown>>;
  const rightRecord = right as Readonly<Record<string, unknown>>;
  const keys = Object.keys(leftRecord);
  return (
    keys.length === Object.keys(rightRecord).length &&
    keys.every((key) => Object.is(leftRecord[key], rightRecord[key]))
  );
}
