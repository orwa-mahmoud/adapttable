/**
 * Table chrome state — the decisions a finished table makes about its own
 * frame, before any kit draws it.
 *
 * Which body region renders, why it is empty, whether a refresh is in
 * flight, whether the footer shows, how clearing filters works, when the
 * selection observer fires, whether reorder is live, the grouping strip's
 * state, the notices for features that cannot run, the filter trigger's
 * toggle and when the table scrolls back to the top. Every binding answers
 * these the same way, so the answers live here.
 */
import { aggregationModel } from "../aggregate/aggregationModel";
import { REORDER_COLUMN_KEY } from "../columns/columnMenuModel";
import type { ColumnMetadata } from "../contracts/columns";
import type {
  GroupingPanelInteractions,
  GroupingPanelState,
} from "../grouping/groupingPanelModel";
import { sourceCapabilities } from "../source/capabilities";
import type { TableSource } from "../source/TableSource";
import {
  collectFeatureNotices,
  type CollectFeatureNoticesInput,
  type FeatureNotice,
} from "../state/featureNotices";
import type { TableLabels } from "../types";

/**
 * Which body region a table renders.
 *
 * @public
 */
export type ChromeBodyRegion = "skeleton" | "empty" | "mobile" | "desktop";

/**
 * Which body region renders: a skeleton while the first load has no rows,
 * the empty state when nothing is left to show, else the card list on a
 * phone and the table on a desktop.
 *
 * @public
 */
export function chromeBodyRegion(input: {
  readonly isLoading: boolean;
  readonly rowCount: number;
  readonly isEmpty: boolean;
  readonly isMobile: boolean;
}): ChromeBodyRegion {
  if (input.isLoading && input.rowCount === 0) return "skeleton";
  if (input.isEmpty) return "empty";
  return input.isMobile ? "mobile" : "desktop";
}

/**
 * Why the body is empty. Zero rows under an active search or filter is
 * "nothing matched" (offer a clear), not "nothing exists".
 *
 * @public
 */
export function chromeEmptyVariant(input: {
  readonly activeFilterCount: number;
  readonly extra?: Readonly<Record<string, unknown>>;
  readonly search: string;
}): "noData" | "noResults" {
  const hasSourceFilters = Object.keys(input.extra ?? {}).length > 0;
  return input.activeFilterCount > 0 || hasSourceFilters || input.search !== ""
    ? "noResults"
    : "noData";
}

/**
 * Whether a background refresh is in flight: fetching, but neither the
 * first load nor a load-more, so the rows on screen may be stale.
 *
 * @public
 */
export function chromeIsRefreshing(
  source: Pick<
    TableSource<unknown>,
    "isFetching" | "isLoading" | "isFetchingNextPage"
  >
): boolean {
  return Boolean(
    source.isFetching && !source.isLoading && !source.isFetchingNextPage
  );
}

/**
 * Whether the paged footer renders: paged, no error, and something to
 * count or something loading.
 *
 * @public
 */
export function chromeShowFooter(
  source: Pick<
    TableSource<unknown>,
    "paginationMode" | "error" | "total" | "isLoading" | "isFetching"
  >
): boolean {
  return (
    source.paginationMode === "paged" &&
    !source.error &&
    (source.total > 0 || source.isLoading || source.isFetching)
  );
}

/**
 * Clear every filter, then tell the host. `onClearFilters` is a
 * notification: the table always performs the clear itself.
 *
 * @public
 */
export function clearChromeFilters(
  source: Pick<TableSource<unknown>, "clearExtras" | "setFilterTree">,
  onClearFilters?: () => void
): void {
  source.clearExtras();
  source.setFilterTree?.(undefined);
  onClearFilters?.();
}

/**
 * The ids to hand an uncontrolled selection observer, or `undefined` when it
 * must stay quiet: a controlled selection already reports every change
 * synchronously, and echoing it would double-fire.
 *
 * Call it whenever the selected set's identity changes (and once on mount);
 * the set only changes identity when the selection does.
 *
 * @public
 */
export function selectionObserverIds(
  controlled: boolean,
  selectedIds: ReadonlySet<string> | undefined
): string[] | undefined {
  if (controlled || !selectedIds) return undefined;
  return [...selectedIds];
}

/**
 * Whether row reorder is composed, and the state to render when its column
 * is also visible.
 *
 * @public
 */
export function rowReorderEnablement<TState>(
  published: TState | undefined,
  isHidden: (key: string) => boolean
): {
  readonly hasRowReorder: boolean;
  readonly rowReorder: TState | undefined;
} {
  const hasRowReorder = published !== undefined;
  return {
    hasRowReorder,
    rowReorder:
      hasRowReorder && !isHidden(REORDER_COLUMN_KEY) ? published : undefined,
  };
}

/**
 * The grouping strip's state, built from the choices this render carries.
 *
 * Built from a published view instead, the list would describe the render
 * before the reader's click — which reads as the control doing nothing.
 *
 * @public
 */
export function groupingPanelState<TRow>(input: {
  readonly interactions: GroupingPanelInteractions | undefined;
  readonly groupBy: readonly string[];
  readonly columns: readonly ColumnMetadata<TRow>[];
  readonly source: Pick<
    TableSource<TRow>,
    | "groupAggregateOverrides"
    | "setGroupAggregateOverrides"
    | "allFilteredRows"
    | "groups"
    | "capabilities"
    | "honorsAggregates"
    | "queryAggregates"
    | "aggregateOperations"
  >;
}): GroupingPanelState | undefined {
  const { interactions, source } = input;
  if (!interactions) return undefined;
  const grouping = sourceCapabilities({
    allFilteredRows: source.allFilteredRows,
    groups: source.groups,
    capabilities: source.capabilities,
  }).grouping;
  const overrides = source.groupAggregateOverrides ?? {};
  return {
    ...interactions,
    groupBy: input.groupBy,
    aggregateOverrides: overrides,
    canSetAggregates:
      source.setGroupAggregateOverrides !== undefined &&
      (grouping !== "server" || source.honorsAggregates === true),
    aggregations: aggregationModel({
      columns: input.columns,
      overrides,
      declared: interactions.declaredAggregates,
      queryAggregates: source.queryAggregates,
      source: {
        grouping,
        aggregateOperations:
          source.honorsAggregates === false ? [] : source.aggregateOperations,
      },
    }),
  };
}

/**
 * The options a table's feature notices read.
 *
 * @public
 */
export interface ChromeFeatureNoticesInput<TRow> {
  /** The table's options, as composed. */
  readonly options: Pick<
    CollectFeatureNoticesInput<TRow>,
    | "virtualize"
    | "onCellEdit"
    | "rowEditing"
    | "onRowEdit"
    | "batchEditing"
    | "onBatchEdit"
    | "exportCsv"
  > & {
    readonly pinnedRowIds?: unknown;
    readonly onPinnedRowIdsChange?: unknown;
  };
  /** The view source. */
  readonly source: Pick<
    TableSource<TRow>,
    "paginationMode" | "allFilteredRows" | "groups" | "total" | "capabilities"
  >;
  /** What the host asked to group by. */
  readonly groupByKeys: readonly string[];
  /** Whether row reorder was composed. */
  readonly rowReorderRequested: boolean;
  /** Whether grouping or a tree is armed. */
  readonly nestedArmed: boolean;
  /** Whether any declared column is editable. */
  readonly hasEditableColumn: boolean;
  /** Resolved labels. */
  readonly labels: TableLabels;
}

/**
 * The opted-in features that cannot run, raised by the chrome — a table
 * told to group by a key its source cannot group on has to say so even when
 * the feature that would have grouped was never imported.
 *
 * @public
 */
export function chromeFeatureNotices<TRow>(
  input: ChromeFeatureNoticesInput<TRow>
): readonly FeatureNotice[] {
  const { options, source } = input;
  return collectFeatureNotices({
    virtualize: options.virtualize,
    paginationMode: source.paginationMode,
    groupByKeys: input.groupByKeys,
    allFilteredRows: source.allFilteredRows,
    serverGroups: source.groups,
    total: source.total,
    capabilities: source.capabilities,
    rowPinningRequested:
      options.pinnedRowIds !== undefined ||
      options.onPinnedRowIdsChange !== undefined,
    rowReorderRequested: input.rowReorderRequested,
    nestedArmed: input.nestedArmed,
    hasEditableColumn: input.hasEditableColumn,
    onCellEdit: options.onCellEdit,
    rowEditing: options.rowEditing,
    onRowEdit: options.onRowEdit,
    batchEditing: options.batchEditing,
    onBatchEdit: options.onBatchEdit,
    exportCsv: options.exportCsv,
    labels: input.labels,
  });
}

/**
 * The root's `data-adapttable-notices` value, or `undefined` to remove it.
 *
 * @public
 */
export function featureNoticesAttribute(
  notices: readonly Pick<FeatureNotice, "kind">[]
): string | undefined {
  const value = notices.map((notice) => notice.kind).join(" ");
  return value === "" ? undefined : value;
}

/**
 * Write {@link featureNoticesAttribute} onto the table root.
 *
 * @public
 */
export function applyFeatureNoticesAttribute(
  root: HTMLElement | null,
  notices: readonly Pick<FeatureNotice, "kind">[]
): void {
  if (!root) return;
  const value = featureNoticesAttribute(notices);
  if (value) root.dataset.adapttableNotices = value;
  else delete root.dataset.adapttableNotices;
}

/**
 * A toggle for the Filters trigger that survives every kit's outside-close.
 *
 * Some kits close the popover on the trigger's own pointer-down; a plain
 * toggle on click then instantly reopens it, so the button could never close
 * the popover. This records whether the overlay was open at pointer-down:
 * if the kit closed it in between, the click is swallowed.
 *
 * @public
 */
export class FilterTriggerToggleState {
  #wasOpenAtPointerDown = false;

  /**
   * The press began on the trigger.
   *
   * @param open - Whether the overlay is open right now.
   */
  pointerDown(open: boolean): void {
    this.#wasOpenAtPointerDown = open;
  }

  /**
   * The trigger was clicked.
   *
   * @param open - Whether the overlay is open right now.
   * @returns Whether the click should toggle the overlay.
   */
  click(open: boolean): boolean {
    const closedByKit = this.#wasOpenAtPointerDown && !open;
    this.#wasOpenAtPointerDown = false;
    return !closedByKit;
  }
}

/**
 * The values whose change scrolls the table back below the sticky chrome:
 * search, sort, active filters, and the page — the page only when paged,
 * because an infinite list's page grows at the bottom while the reader is
 * mid-scroll.
 *
 * @public
 */
export function scrollResetKeys(
  source: Pick<
    TableSource<unknown>,
    "search" | "sortBy" | "sortDir" | "paginationMode" | "page"
  >,
  activeFilterCount: number
): readonly (string | number)[] {
  return [
    source.search,
    source.sortBy ?? "",
    source.sortDir ?? "",
    source.paginationMode === "paged" ? source.page : 0,
    activeFilterCount,
  ];
}

/**
 * The rows in the whole dataset, for a card list's `aria-setsize`: a
 * windowed list states its size per item.
 *
 * @public
 */
export function cardSetSize(
  source: Pick<TableSource<unknown>, "total" | "rows">,
  windowStart: number
): number {
  return Math.max(source.total, windowStart + source.rows.length);
}

/**
 * The column name a sort announcement speaks: the string header, else the
 * key, else nothing.
 *
 * @public
 */
export function sortedColumnName(
  columns: readonly { readonly key: string; readonly header?: unknown }[],
  sortBy: string | undefined
): string | undefined {
  const column = columns.find((candidate) => candidate.key === sortBy);
  return typeof column?.header === "string" ? column.header : column?.key;
}
