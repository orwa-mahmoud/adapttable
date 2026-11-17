/**
 * Incremental re-evaluation of a patched row set.
 *
 * `applyRowPatches` is the data path — it still owns the rows. This
 * module sits on the patch log and re-runs search, filters, sort, grouping
 * and aggregates for the rows a patch touched, instead of walking the
 * whole set again.
 *
 * Build a snapshot with `createIncrementalView`, then feed patches
 * through `applyRowPatchesToView`. A host that already called
 * `applyRowPatches` can pass `rowPatchLog` into
 * {@link applyRowPatchLogToView} so the same patches are not applied twice.
 * Every snapshot stays valid: a patch returns a new one and leaves the one
 * it started from as it was.
 */
import type { AggregateOptions, AggregateSpec } from "../aggregate/aggregate";
import type {
  ColumnMetadata,
  ExtraFilters,
  SortableValue,
  SortDirection,
} from "../contracts/columns";
import type { QueryFilterGroup, SortLevel } from "../contracts/query";
import type { RowPatch, RowPatchLog } from "../contracts/rows";
import type { DisplayValue } from "../display";
import { engineSearchText } from "../engine/searchText";
import type { GroupAggregateOps } from "../grouping/groupRowLayout";
import type {
  GroupAggregatesFn,
  GroupedFlatEntry,
  GroupNode,
  GroupPaging,
  GroupSort,
} from "../grouping/groupRows";
import {
  applyPatchLog,
  evaluated,
  evaluateRows,
  evaluationOf,
  reconfigureView,
} from "./evaluator";
import { groupsAndTotals } from "./groupsAndTotals";
import {
  attachIncrementalView as attachView,
  incrementalViewOf as viewOf,
} from "./incrementalView";
import { applyRowPatchesWithLog } from "./patch";

export { rowPatchLog } from "./patch";

/**
 * How the table turns a row set into a filtered, sorted, grouped view.
 *
 * @public
 */
export interface IncrementalViewConfig<TRow> {
  /** How a row's id is derived; the table's own `rowKey`. */
  getRowId: (row: TRow) => string;
  /**
   * Project a row to its searchable text. Defaults to a flatten of the
   * row's own values — the same default `useFrontendData` uses.
   */
  getSearchText?: (row: TRow) => string;
  /** Active search term. Empty / omitted means no search. */
  search?: string;
  /** Client-side extra-filter predicate. */
  filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /** The extra-filter bag `filterFn` reads. */
  extra?: ExtraFilters;
  /**
   * Evaluate the AND/OR filter tree against a row. Omit and the tree is
   * stored but not applied — same seam as `useFrontendData`.
   */
  filterTreeFn?: (row: TRow, tree: QueryFilterGroup) => boolean;
  /** The active filter tree, when there is one. */
  filterTree?: QueryFilterGroup;
  /** Columns — sort and group values resolve through these. */
  columns?: readonly ColumnMetadata<TRow>[];
  /**
   * Active locale tag. A column's sort value reads its `i18n` path for this
   * locale — the same path its cells and filters read.
   */
  locale?: string;
  /** Override a column's sort value. */
  getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  /** Single-column sort. Ignored when `sortLevels` is non-empty. */
  sortBy?: string;
  /** Single-column sort direction. */
  sortDir?: SortDirection;
  /** Multi-column sort chain. Supersedes `sortBy` / `sortDir`. */
  sortLevels?: readonly SortLevel[];
  /** Group by one key, or several for a nested grouping. */
  groupBy?: string | readonly string[];
  /** Per-group cells — same signature as `summaryRow`. */
  groupAggregates?: GroupAggregatesFn<TRow>;
  /**
   * Which operation produced each of those cells, where it is known. Carried
   * onto every group so a column can format a total and a count differently.
   */
  groupAggregateOps?: GroupAggregateOps;
  /**
   * What the derived callbacks would answer, as a value.
   *
   * A host rebuilds `groupAggregates`, `groupSort` and `groupFilter` on every
   * render, so their identity says nothing and is deliberately ignored — but
   * their BEHAVIOUR does change, when a reader picks a different aggregation.
   * Set this to something that changes with the choice (the serialized
   * overrides, say) and the groups are rebuilt exactly then.
   */
  derivedKey?: string;
  /** Order groups within their parent. */
  groupSort?: GroupSort<TRow>;
  /** Keep only the groups this answers true for. */
  groupFilter?: (group: GroupNode<TRow>) => boolean;
  /** Close every group with a footer row. */
  groupFooters?: boolean;
  /** Collapsed group keys. */
  collapsedGroupIds?: ReadonlySet<string>;
  /** Override the blank-group label. */
  blankLabel?: string;
  /** Page size for top-level groups. */
  groupPageSize?: number;
  /** Page size for leaves inside a group. */
  rowPageSize?: number;
  /** How many extra groups / rows are currently revealed. */
  paging?: GroupPaging;
  /** Grand-total mapper over the sorted (filtered) set. */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, DisplayValue>>;
  /**
   * Built-in aggregate spec for incremental totals. Used for the grand
   * total when `summaryRow` is omitted, and for group cells when
   * `groupAggregates` is omitted.
   */
  aggregateSpec?: AggregateSpec;
  /** Options for {@link IncrementalViewConfig.aggregateSpec}. */
  aggregateOptions?: AggregateOptions<TRow>;
}

/**
 * A derived snapshot of a row set. The latest snapshot is the only one
 * `applyRowPatchesToView` may be called on — applying to a stale
 * snapshot rebuilds from its `rows` instead of continuing incrementally.
 *
 * @public
 */
export interface IncrementalView<TRow> {
  /** Source rows after patches — same contract as `applyRowPatches`. */
  readonly rows: readonly TRow[];
  /** After search, extra filters and the filter tree. */
  readonly filtered: readonly TRow[];
  /** After sort, or `filtered` when unsorted. */
  readonly sorted: readonly TRow[];
  /** Grouped flat model, when grouping is configured. */
  readonly groups: readonly GroupedFlatEntry<TRow>[] | undefined;
  /** Grand-total cells over `sorted`. */
  readonly aggregates: Partial<Record<string, DisplayValue>> | undefined;
}

/**
 * The snapshot `createIncrementalView` attached to a derived row
 * array (`rows` / `filtered` / `sorted`, or a page slice the host
 * attached). Spreading that array drops the link, same as
 * `rowPatchLog`.
 *
 * @public
 */
export function incrementalViewOf<TRow>(
  rows: readonly TRow[]
): IncrementalView<TRow> | undefined {
  return viewOf<IncrementalView<TRow>>(rows);
}

/**
 * Point a derived array (a page slice) at the snapshot it came from, so
 * {@link incrementalViewOf} can find aggregates / groups without a
 * second argument.
 *
 * @public
 */
export function attachIncrementalView<TRow>(
  rows: readonly TRow[],
  view: IncrementalView<TRow>
): void {
  attachView(rows, view);
}

/**
 * The config the snapshot was last built or reconfigured with.
 *
 * @public
 */
export function incrementalViewConfig<TRow>(
  view: IncrementalView<TRow>
): IncrementalViewConfig<TRow> | undefined {
  return evaluationOf(view)?.config;
}

/**
 * Merge new settings into a snapshot without walking the row set when
 * only grouping / summary extras changed.
 *
 * Filter, sort and search changes rebuild the derived arrays. Grouping
 * and summary extras rebuild only those stages and keep `filtered` /
 * `sorted` identity. A patch that only replaces a callback or a
 * `columns` array with the same keys returns the same view object —
 * hosts rebuild those every render, and a new view identity must not
 * ripple into the page slice.
 *
 * @typeParam TRow - The row type.
 * @param view - The latest snapshot.
 * @param patch - Fields to merge. `undefined` entries are ignored.
 *
 * @public
 */
export function configureIncrementalView<TRow>(
  view: IncrementalView<TRow>,
  patch: Partial<IncrementalViewConfig<TRow>>
): IncrementalView<TRow> {
  return reconfigureView(view, patch, [], "in place");
}

/**
 * Default searchable-text projector: flatten a row's own values — the
 * engine's {@link engineSearchText}, under the name the incremental view
 * has always published.
 *
 * @public
 */
export function incrementalSearchText<TRow>(row: TRow): string {
  return engineSearchText(row);
}

/**
 * Build a snapshot by fully evaluating `rows`. Patches after this go
 * through `applyRowPatchesToView` so only touched rows are
 * re-evaluated.
 *
 * @typeParam TRow - The row type.
 * @param rows - The current source rows.
 * @param config - Filter / sort / group / aggregate settings.
 *
 * @public
 */
export function createIncrementalView<TRow>(
  rows: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): IncrementalView<TRow> {
  return evaluateRows(rows, config, groupsAndTotals());
}

/**
 * Apply patches to a snapshot: `applyRowPatches` for the rows, then
 * incremental re-evaluation of every derived stage.
 *
 * @typeParam TRow - The row type.
 * @param view - The snapshot to continue.
 * @param patches - The changes to apply, in order.
 *
 * @public
 */
export function applyRowPatchesToView<TRow>(
  view: IncrementalView<TRow>,
  patches: readonly RowPatch<TRow>[]
): IncrementalView<TRow> {
  const evaluation = evaluated(view, "applyRowPatchesToView");
  return applyPatchLog(
    view,
    applyRowPatchesWithLog(view.rows, patches, evaluation.config.getRowId)
  );
}

/**
 * Continue a snapshot from a log `applyRowPatches` already produced.
 * Use this when the host applied the patches itself and the incremental
 * view must not apply them a second time.
 *
 * @typeParam TRow - The row type.
 * @param view - The snapshot taken against the pre-patch rows.
 * @param log - The log attached to the post-patch array.
 *
 * @public
 */
export function applyRowPatchLogToView<TRow>(
  view: IncrementalView<TRow>,
  log: RowPatchLog<TRow>
): IncrementalView<TRow> {
  return applyPatchLog(view, log);
}

/**
 * Whether two snapshots derive the same rows, groups and totals: the same
 * record, or a record that carries another configuration over the same
 * results.
 *
 * @internal
 */
export function sameIncrementalResults(
  a: IncrementalView<unknown>,
  b: IncrementalView<unknown>
): boolean {
  return (
    a === b ||
    (a.rows === b.rows &&
      a.filtered === b.filtered &&
      a.sorted === b.sorted &&
      a.groups === b.groups &&
      a.aggregates === b.aggregates)
  );
}

/**
 * Whether `view` was built with groups and totals, as
 * `createIncrementalView` builds it. A basic-engine row array carries
 * a snapshot without them, and grouping must not reconfigure that.
 */
export function hasIncrementalSnapshot<TRow>(
  view: IncrementalView<TRow>
): boolean {
  return evaluationOf(view)?.stage !== undefined;
}
