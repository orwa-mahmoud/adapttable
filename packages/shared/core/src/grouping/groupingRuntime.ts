/**
 * The grouping feature's runtime: what a live table derives once `groupBy`
 * is set.
 *
 * A binding keeps the collapse and paging state and re-runs these on the
 * inputs it memoizes on. What they decide — which operations the source can
 * aggregate, when grouping is ignored, how the grouped model is built, what
 * "show more" asks for, and how the source is widened to the full filtered
 * set — is the same in every framework.
 */
import type { AggregationSourceSupport } from "../aggregate/aggregatable";
import {
  type DeclaredAggregates,
  declaredAggregates,
} from "../aggregate/aggregate";
import {
  type AggregationModel,
  aggregationModel,
  computedAggregateKeys,
  effectiveAggregateOps,
  serializeAggregationDerivedKey,
} from "../aggregate/aggregationModel";
import type { ColumnMetadata } from "../contracts/columns";
import {
  type ExtraEntry,
  type ExtraRow,
  insertExtraRows,
} from "../rows/extraRows";
import { capabilityReason, sourceCapabilities } from "../source/capabilities";
import type { TableSource } from "../source/TableSource";
import { withGroupAggregateOverrides } from "./groupAggregateOverrides";
import {
  groupedEntriesForStrategy,
  groupingComputationKind,
} from "./groupingStrategy";
import type {
  GroupAggregatesFn,
  GroupedFlatEntry,
  GroupNode,
  GroupPaging,
  GroupSort,
} from "./groupRows";

/**
 * The parts of a table source grouping reads.
 *
 * @public
 */
export type GroupingRuntimeSource<TRow> = Pick<
  TableSource<TRow>,
  | "allFilteredRows"
  | "groups"
  | "capabilities"
  | "honorsAggregates"
  | "aggregateOperations"
  | "groupAggregateOverrides"
  | "queryAggregates"
  | "groupAggregations"
>;

/**
 * What the source can aggregate: where grouping runs, and the operations the
 * backend lists — none at all when it will not honour aggregate requests.
 *
 * @param source - The live source.
 * @returns The support the aggregation model gates on.
 *
 * @public
 */
export function groupingAggregationSource<TRow>(
  source: GroupingRuntimeSource<TRow>
): AggregationSourceSupport {
  return {
    grouping: sourceCapabilities({
      allFilteredRows: source.allFilteredRows,
      groups: source.groups,
      capabilities: source.capabilities,
    }).grouping,
    aggregateOperations:
      source.honorsAggregates === false ? [] : source.aggregateOperations,
  };
}

/**
 * The development warning for a `groupBy` the source cannot honour, or
 * `undefined` when grouping can run or nothing is grouped.
 *
 * @param groupByKeys - The requested grouping keys.
 * @param source - The live source.
 * @returns The message to warn with, if any.
 *
 * @public
 */
export function groupingIgnoredWarning<TRow>(
  groupByKeys: readonly string[],
  source: Pick<
    GroupingRuntimeSource<TRow>,
    "allFilteredRows" | "groups" | "capabilities"
  >
): string | undefined {
  if (groupByKeys.length === 0) return undefined;
  const canGroup = sourceCapabilities({
    allFilteredRows: source.allFilteredRows,
    groups: source.groups,
    capabilities: source.capabilities,
  }).grouping;
  if (canGroup !== false) return undefined;
  return `groupBy is ignored: ${capabilityReason("grouping")} Grouping needs either the full filtered set (\`allFilteredRows\`, which the frontend tier provides) or a source that groups server-side.`;
}

/**
 * What grouping reads besides the source to build its aggregates.
 *
 * @public
 */
export interface GroupingAggregatesOptions<TRow> {
  /** The live source. */
  readonly source: GroupingRuntimeSource<TRow>;
  /** Every table column — the schema, never the visible subset. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** The host's `groupAggregates` mapper. */
  readonly groupAggregates?: (rows: readonly TRow[]) => unknown;
  /** What the grouping panel published as declared, when it is composed. */
  readonly panelDeclared?: DeclaredAggregates;
}

/**
 * The aggregates grouping computes, resolved once per input change.
 *
 * @public
 */
export interface GroupingAggregates<TRow> {
  /** What the source can aggregate. */
  readonly source: AggregationSourceSupport;
  /** The host's mapper with the reader's overrides applied. */
  readonly aggregates: GroupAggregatesFn<TRow> | undefined;
  /** What the developer declared, from the mapper or the panel. */
  readonly declared: DeclaredAggregates | undefined;
  /**
   * The aggregates as one value — reader overrides alone are not enough: a
   * host default changing from Sum to Average with the same rows must
   * rebuild the cached groups.
   */
  readonly derivedKey: string | undefined;
}

/**
 * Resolve the aggregates the grouped model computes.
 *
 * @param options - See {@link GroupingAggregatesOptions}.
 * @returns The resolved aggregates.
 *
 * @public
 */
export function groupingAggregates<TRow>(
  options: GroupingAggregatesOptions<TRow>
): GroupingAggregates<TRow> {
  const { source, columns } = options;
  const support = groupingAggregationSource(source);
  const overrides = source.groupAggregateOverrides ?? {};
  const aggregates = withGroupAggregateOverrides(
    options.groupAggregates as GroupAggregatesFn<TRow> | undefined,
    overrides,
    columns,
    support
  );
  const declared = declaredAggregates(aggregates) ?? options.panelDeclared;
  return {
    source: support,
    aggregates,
    declared,
    derivedKey: serializeAggregationDerivedKey({
      columns,
      overrides,
      declared,
      queryAggregates: source.queryAggregates,
      source: support,
    }),
  };
}

/**
 * What {@link groupedRowModel} needs.
 *
 * @public
 */
export interface GroupedRowModelOptions<TRow> {
  /** The grouping keys, outermost first. */
  readonly groupByKeys: readonly string[];
  /** The live source. */
  readonly source: GroupingRuntimeSource<TRow>;
  /** Every table column — the schema, never the visible subset. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** Active locale tag, for each grouped column's `i18n` path. */
  readonly locale?: string;
  /** Row identity. */
  readonly getRowId: (row: TRow) => string;
  /** Groups the reader closed. */
  readonly collapsedGroupIds: ReadonlySet<string>;
  /** The resolved aggregates, from {@link groupingAggregates}. */
  readonly aggregates: GroupingAggregates<TRow>;
  /** Draw a footer row under each group. */
  readonly groupFooters?: boolean;
  /** Order the groups themselves. */
  readonly groupSort?: GroupSort<TRow>;
  /** Keep only the groups this accepts. */
  readonly groupFilter?: (group: GroupNode<TRow>) => boolean;
  /** Groups shown per page. */
  readonly groupPageSize?: number;
  /** Rows shown per group page. */
  readonly groupRowPageSize?: number;
  /** How much of a paged model has been asked for. */
  readonly paging?: GroupPaging;
  /** Host-injected separators and full-width rows. */
  readonly extraRows?: readonly ExtraRow[];
}

/**
 * The grouped rows, and the groups currently open.
 *
 * @public
 */
export interface GroupedRowModel<TRow> {
  /** Flat group-header, leaf and extra entries, in render order. */
  readonly entries: readonly (GroupedFlatEntry<TRow> | ExtraEntry)[];
  /** Every group header in the model, with its depth. */
  readonly openGroups: readonly { key: string; level: number }[];
}

/**
 * Build the grouped row model, or `undefined` when nothing groups — no keys,
 * or a source that cannot group or has not answered yet.
 *
 * Columns are the schema, never the visible subset: a column carries the
 * `groupValue` that says which bucket a row belongs in, and hiding it must
 * not change how rows are bucketed or what those buckets are called.
 *
 * @param options - See {@link GroupedRowModelOptions}.
 * @returns The model, or `undefined`.
 *
 * @public
 */
export function groupedRowModel<TRow>(
  options: GroupedRowModelOptions<TRow>
): GroupedRowModel<TRow> | undefined {
  const { groupByKeys, source, columns, aggregates } = options;
  if (groupByKeys.length === 0) return undefined;
  const kind = groupingComputationKind({
    groupByKeys,
    sourceGroups: source.groups,
    allFilteredRows: source.allFilteredRows,
    capabilities: source.capabilities,
  });
  if (kind === "none") return undefined;
  const entries = groupedEntriesForStrategy({
    kind,
    groupByKeys,
    sourceGroups: source.groups,
    allFilteredRows: source.allFilteredRows,
    columns,
    locale: options.locale,
    getRowId: options.getRowId,
    collapsedGroupIds: options.collapsedGroupIds,
    aggregates: aggregates.aggregates,
    footers: options.groupFooters === true,
    sort: options.groupSort,
    filter: options.groupFilter,
    groupPageSize: options.groupPageSize,
    rowPageSize: options.groupRowPageSize,
    paging: options.paging,
    derivedKey: aggregates.derivedKey,
    // Server groups: only metadata tied to the displayed response.
    // `undefined` means the operation is unknown — never the reader's latest
    // request. Local groups: the operation actually applied after defaults,
    // host declarations and validated overrides.
    aggregateOps:
      kind === "source"
        ? source.groupAggregations
        : effectiveAggregateOps({
            columns,
            overrides: source.groupAggregateOverrides ?? {},
            declared: aggregates.declared,
            queryAggregates: source.queryAggregates,
            source: aggregates.source,
          }),
  });
  const openGroups = entries.flatMap((entry) =>
    entry.kind === "group" ? [{ key: entry.key, level: entry.level }] : []
  );
  return {
    entries: insertExtraRows(entries, options.extraRows, (entry) =>
      entry.kind === "row" ? entry.key : undefined
    ),
    openGroups,
  };
}

/**
 * What a "show more" row asks for.
 *
 * @public
 */
export interface GroupShowMoreRequest {
  /** How many more to reveal. */
  readonly pageSize: number;
  /** The group whose leaves to extend; absent for the top-level groups. */
  readonly groupKey?: string;
  /** The group the host is asked to fetch the rest of, when it pages rows. */
  readonly loadMoreKey?: string;
}

/**
 * Resolve a "show more" row into a paging step and, for a group's rows, the
 * host fetch it implies.
 *
 * @param entry - The show-more entry the reader pressed.
 * @param sizes - The configured page sizes.
 * @returns The request.
 *
 * @public
 */
export function groupShowMoreRequest(
  entry: { readonly scope: "groups" | "rows"; readonly groupKey?: string },
  sizes: { readonly groupPageSize?: number; readonly groupRowPageSize?: number }
): GroupShowMoreRequest {
  const pageSize =
    entry.scope === "groups"
      ? (sizes.groupPageSize ?? 0)
      : (sizes.groupRowPageSize ?? 0);
  return {
    pageSize,
    groupKey: entry.groupKey,
    loadMoreKey:
      entry.scope === "rows" && entry.groupKey ? entry.groupKey : undefined,
  };
}

/**
 * The source a grouped table renders from: the full filtered set as one page,
 * since groups span pages. The source itself when it did not hand the set over.
 *
 * @param source - The live source.
 * @returns The widened source.
 *
 * @public
 */
export function groupedViewSource<
  TSource extends { readonly allFilteredRows?: readonly unknown[] },
>(source: TSource): TSource {
  const all = source.allFilteredRows;
  if (!all) return source;
  const widened = {
    ...source,
    rows: all,
    page: 1,
    limit: Math.max(all.length, 1),
    total: all.length,
    hasNextPage: false,
    isFetchingNextPage: false,
  };
  return widened;
}

/**
 * The aggregation list the grouping panel and the column menu read, from the
 * grouped model as it stands.
 *
 * @param options - The source, the columns, what the panel declared, and the
 *   grouped entries when a model was built.
 * @returns The aggregation model.
 *
 * @public
 */
export function groupingPanelAggregations<TRow>(options: {
  readonly source: GroupingRuntimeSource<TRow>;
  readonly columns: readonly ColumnMetadata<TRow>[];
  readonly declared?: DeclaredAggregates;
  readonly entries?: readonly {
    readonly kind: string;
    readonly aggregateCells?: Readonly<Record<string, unknown>>;
  }[];
}): AggregationModel {
  const { source } = options;
  return aggregationModel({
    columns: options.columns,
    overrides: source.groupAggregateOverrides ?? {},
    declared: options.declared,
    queryAggregates: source.queryAggregates,
    computedKeys: options.entries ? computedAggregateKeys(options.entries) : [],
    source: groupingAggregationSource(source),
  });
}
