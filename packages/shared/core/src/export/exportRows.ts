/**
 * Row and column resolution shared by every export format.
 *
 * Scopes, trees and column lists are decided here. A writer receives the
 * result and does not choose which rows leave the table.
 */

import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
} from "../columns/columnMenuModel";
import type { ColumnMetadata } from "../contracts/columns";
import type { CapabilitySource } from "../contracts/source";
import type { FeatureHostState } from "../features/currentHost";
import { type CellRange, cellRangeIndices } from "../focus/cellRange";
import { parseGroupBy } from "../grouping/groupKeys";
import { sourceCapabilities } from "../source/capabilities";
import type { TableSource } from "../source/TableSource";
import { buildTreeEntries, type TreeEntry } from "../tree/treeRows";
import { treeExportExpandedIds } from "../tree/treeRuntime";
import { devWarn } from "../utils/devWarn";
import {
  exportViewFromChrome,
  filterExportView,
  summaryExportValues,
  viewFromTreeEntries,
} from "./exportView";
import {
  defaultExportFilename,
  type ExportViewEntry,
  type ExportWriter,
} from "./exportWriter";
import {
  EXPORT_FETCH_ALL_MAX_ROWS,
  type ExportAllQuery,
  type ExportColumnScope,
  type ExportContext,
  type ExportCsvOptions,
  type ExportCsvProp,
  type ExportQuery,
  type ExportRowScope,
  type FetchAllExport,
} from "./tableExportContract";

/**
 * Walk a server source page by page for `scope: "all"`.
 *
 * @typeParam TRow - The row type.
 * @param source - The table's source, for the current query and page size.
 * @param config - See {@link FetchAllExport}.
 * @returns Every row the query matches, up to the cap.
 *
 * @public
 */
export async function fetchAllExportRows<TRow>(
  source: TableSource<TRow>,
  config: FetchAllExport<TRow>
): Promise<readonly TRow[]> {
  const limit = config.pageSize ?? source.limit ?? 100;
  const maxRows = config.maxRows ?? EXPORT_FETCH_ALL_MAX_ROWS;
  const base = exportQueryOf(source, "page");
  const out: TRow[] = [];
  let reachedEnd = false;
  let page = 1;
  while (out.length < maxRows && !reachedEnd) {
    const batch = await config.fetchPage({ ...base, page, limit });
    out.push(...batch);
    // A short page is the end of the set; an empty one guards a source that
    // answers the page after the last with an empty array rather than fewer.
    reachedEnd = batch.length < limit;
    page += 1;
  }
  // Stopping ON the cap is still stopping short — a full last page says
  // nothing about whether more exist, so only a short page proves the end.
  if (!reachedEnd) {
    const rows = Math.min(out.length, maxRows);
    config.onCapped?.({ rows, maxRows });
    return out.slice(0, rows);
  }
  return out;
}

/**
 * Resolve a boolean-or-options prop into a concrete config, or `null` when off.
 *
 * @public
 */
export function resolveExportCsv<TRow = unknown>(
  value: ExportCsvProp<TRow>,
  host?: FeatureHostState
): ExportCsvOptions<TRow> | null {
  if (value === false) return null;
  const writers = host?.writers;
  const writer = writers?.[writers.length - 1];
  if (value === undefined) return writer ? { writer } : null;
  if (value === true) return writer ? { writer } : {};
  if (value.writer || !writer) return value;
  return { ...value, writer };
}

/** Whether the source itself can execute an all-rows export. */
export function sourceProvidesAllExportRows(source: CapabilitySource): boolean {
  return (
    source.allFilteredRows !== undefined &&
    sourceCapabilities(source).exportScope === "all"
  );
}

/**
 * Whether `scope: "all"` lacks a route to the full filtered set.
 *
 * A frontend source that both exposes `allFilteredRows` and declares that
 * export-all is supported can answer through the source. A host-provided
 * `onExportAll` / `request` / `fetchAll` route can answer independently. A
 * capability declaration describes support; it never creates access to rows.
 */
export function exportAllFallsBackToPage<TRow = unknown>(
  exportCsv: ExportCsvProp<TRow>,
  source: CapabilitySource
): boolean {
  const options = resolveExportCsv(exportCsv);
  // A source declaration may constrain its own row route. Host-owned routes
  // are executable independently and remain valid whatever the source says.
  return Boolean(
    options?.scope === "all" &&
    options.onExportAll === undefined &&
    options.request === undefined &&
    options.fetchAll === undefined &&
    !sourceProvidesAllExportRows(source)
  );
}

/**
 * Columns that belong in a CSV (drop synthetic actions and reorder columns).
 *
 * @public
 */
export function exportableColumns<TRow>(
  columns: readonly ColumnMetadata<TRow>[]
): ColumnMetadata<TRow>[] {
  return columns.filter(
    (column) =>
      column.key !== ACTIONS_COLUMN_KEY && column.key !== REORDER_COLUMN_KEY
  );
}

/**
 * Pick the column set an export scope asks for, minus the actions column.
 *
 * @public
 */
export function resolveExportColumns<TRow>(
  scope: ExportColumnScope | undefined,
  visible: readonly ColumnMetadata<TRow>[],
  all: readonly ColumnMetadata<TRow>[] | undefined
): ColumnMetadata<TRow>[] {
  const keys: readonly string[] | undefined =
    typeof scope === "string" || scope === undefined ? undefined : scope;
  const pool = exportableColumns(
    scope === "all" || keys ? (all ?? visible) : visible
  );
  if (!keys) return pool;
  // Order follows the caller's list, not the table's, because an explicit
  // list is a statement about the file's shape.
  const byKey = new Map(pool.map((column) => [column.key, column]));
  return keys.flatMap((key) => {
    const column = byKey.get(key);
    return column ? [column] : [];
  });
}

/**
 * The rows a highlighted rectangle covers.
 *
 * A range addresses rows by their place in the dataset, because that is what a
 * screen reader is told and what survives scrolling. Turning one back into rows
 * is therefore an offset subtraction — and every row in a range is loaded, since
 * navigation cannot leave the loaded window. A programmatic selection that
 * reaches past it drops those rows rather than exporting blanks.
 */
function rowsInRange<TRow>(
  range: CellRange,
  source: TableSource<TRow>,
  firstRowIndex: number
): readonly TRow[] {
  return cellRangeIndices(range).rows.flatMap((index) => {
    const row = source.rows[index - firstRowIndex];
    return row === undefined ? [] : [row];
  });
}

/** The rows a scope asks for, in table order. */
function resolveExportRows<TRow>(
  scope: ExportRowScope,
  source: TableSource<TRow>,
  context: ExportContext<TRow> | undefined
): readonly TRow[] {
  if (scope === "page") return source.rows;
  if (scope === "range") {
    const { range, firstRowIndex } = context ?? {};
    if (!range) {
      devWarn(
        'exportCsv scope "range" needs a selected cell range, which needs `cellNavigation`. Nothing is selected, so the current page is exported instead.'
      );
      return source.rows;
    }
    return rowsInRange(range, source, firstRowIndex ?? 0);
  }
  if (scope === "all") {
    if (!source.allFilteredRows) {
      // Reached only by a hand-built call: the toolbar handler refuses to
      // render an "all" button a server source cannot answer.
      devWarn(
        'exportCsv scope "all" needs the full filtered set. This source exposes only the current page, so that is what is exported. Pass `onExportAll`, `request`, or `fetchAll` to export everything from a server tier.'
      );
    }
    return source.allFilteredRows ?? source.rows;
  }
  const { selectedIds, getRowId } = context ?? {};
  if (!selectedIds || !getRowId) {
    devWarn(
      'exportCsv scope "selected" needs the table\'s selection. Adapters pass it automatically; a hand-built call must supply `selectedIds` and `getRowId`. Exporting the current page instead.'
    );
    return source.rows;
  }
  // Search the widest set available, so a row checked on an earlier page is
  // still in the file when a later page is on screen.
  const searchable = source.allFilteredRows ?? source.rows;
  return searchable.filter((row) => selectedIds.has(getRowId(row)));
}

/** Resolve only the export hierarchy; runtime inventories stay page-scoped. */
function resolveExportTree<TRow>(
  scope: ExportRowScope,
  source: TableSource<TRow>,
  context: ExportContext<TRow> | undefined,
  sourceRows: readonly TRow[]
): readonly TreeEntry<TRow>[] | undefined {
  const { tree, getRowId, selectedIds } = context ?? {};
  if (!tree || scope === "range") return undefined;
  const unfold = scope === "all" || scope === "selected";
  if (
    unfold &&
    getRowId &&
    (tree.getChildren || tree.getParentId) &&
    (scope !== "selected" || selectedIds)
  ) {
    const shape = {
      rows: source.allFilteredRows ?? source.rows,
      getRowId,
      getChildren: tree.getChildren,
      getParentId: tree.getParentId,
    };
    const folded = buildTreeEntries({
      ...shape,
      expandedIds: new Set<string>(),
    });
    const entries = buildTreeEntries({
      ...shape,
      expandedIds: treeExportExpandedIds(folded),
    });
    return scope === "selected" && selectedIds
      ? entries.filter((entry) => selectedIds.has(entry.key))
      : entries;
  }
  const entries = unfold ? (tree.allEntries ?? tree.entries) : tree.entries;
  if (!unfold || !getRowId) return entries;
  // Without shape readers, a nested child and a stale excluded flat row are
  // indistinguishable. Preserve the conservative source-membership filter.
  const ids = new Set(sourceRows.map((row) => getRowId(row)));
  return entries.filter((entry) => ids.has(getRowId(entry.row)));
}

export interface ResolvedExport<TRow> {
  rows: readonly TRow[];
  columns: ColumnMetadata<TRow>[];
  treeView?: readonly ExportViewEntry<TRow>[];
  summaryRows: readonly TRow[];
}

/**
 * Resolve scope metadata alongside the writer view. Page metadata retains
 * source rows; all / selected metadata follows the resolved hierarchy.
 * Summary input retains the original source shape, including rollup roots.
 */
export function resolveExport<TRow>(options: {
  source: TableSource<TRow>;
  columns: readonly ColumnMetadata<TRow>[];
  scope?: ExportRowScope;
  columnScope?: ExportColumnScope;
  context?: ExportContext<TRow>;
}): ResolvedExport<TRow> {
  const scope = options.scope ?? "page";
  const range = options.context?.range;
  const summaryRows = resolveExportRows(scope, options.source, options.context);
  const tree = resolveExportTree(
    scope,
    options.source,
    options.context,
    summaryRows
  );
  return {
    rows:
      tree && scope !== "page" ? tree.map((entry) => entry.row) : summaryRows,
    treeView: tree ? viewFromTreeEntries(tree) : undefined,
    summaryRows,
    // A rectangle names its own columns. Asking for one and then exporting
    // every visible column would ignore half of what the user selected, so the
    // range decides here and `columns` is not consulted.
    columns:
      scope === "range" && range
        ? columnsInRange(range, options.columns)
        : resolveExportColumns(
            options.columnScope ?? "visible",
            options.columns,
            options.context?.allColumns
          ),
  };
}

/**
 * The columns a rectangle covers, in table order. Column addresses index the
 * columns as rendered, which is the same list the export is given.
 */
function columnsInRange<TRow>(
  range: CellRange,
  columns: readonly ColumnMetadata<TRow>[]
): ColumnMetadata<TRow>[] {
  return exportableColumns(
    cellRangeIndices(range).cols.flatMap((index) => {
      const column = columns[index];
      return column ? [column] : [];
    })
  );
}

/** Structure and spans for the resolved rows, when the context has them. */
export function exportTableOptions<TRow>(
  resolved: ResolvedExport<TRow>,
  scope: ExportRowScope | undefined,
  context: ExportContext<TRow> | undefined
) {
  const getRowId = context?.getRowId;
  // Page writes the chrome view as it stands — collapsed headers stay,
  // folded leaves stay out. All / selected unfold those leaves first so a
  // ticked row inside a closed group still leaves the table, then prune.
  const includeHiddenLeaves = scope === "all" || scope === "selected";
  const fullView =
    scope === "range"
      ? undefined
      : (resolved.treeView ??
        exportViewFromChrome({
          grouping: context?.grouping,
          groupTotal: context?.groupTotal,
          includeHiddenLeaves,
        }));
  let view = fullView;
  if (scope === "range" || !fullView) view = undefined;
  else if (!resolved.treeView && includeHiddenLeaves && getRowId) {
    view = filterExportView(
      fullView,
      new Set(resolved.rows.map((row) => getRowId(row))),
      getRowId
    );
  }
  return {
    getCellSpan: context?.getCellSpan,
    firstRowIndex: context?.firstRowIndex,
    view,
    summary: summaryExportValues(context?.summaryRow?.(resolved.summaryRows)),
  };
}

/** Build the serializable, page-free view for `onExportAll`. */
export function exportAllQueryOf<TRow>(
  source: TableSource<TRow>,
  visibleColumns: readonly ColumnMetadata<TRow>[],
  options: ExportCsvOptions<TRow>,
  context: ExportContext<TRow> | undefined,
  writer: ExportWriter
): ExportAllQuery {
  const columns = resolveExportColumns(
    options.columns,
    visibleColumns,
    context?.allColumns
  );
  return {
    search: source.search,
    sortBy: source.sortBy,
    sortDir: source.sortDir,
    sortLevels: source.sortLevels,
    filters: source.extra,
    filterTree: source.filterTree,
    groupBy: context?.grouping?.groupBy ?? parseGroupBy(source.groupBy),
    columns: columns.map((column) => column.key),
    visibleColumns: exportableColumns(visibleColumns).map(
      (column) => column.key
    ),
    format: writer.extension,
    filename: options.filename ?? defaultExportFilename(writer),
  };
}

/** The view-defining half of the source's state, for a server export. */
export function exportQueryOf<TRow>(
  source: TableSource<TRow>,
  scope: ExportRowScope
): ExportQuery {
  // "All" is the whole filtered set, so the window the reader happens to be
  // looking at is not part of the question. Sending it invites a backend to
  // answer with one page and call it everything.
  const paged = scope !== "all";
  return {
    page: paged ? source.page : undefined,
    limit: paged ? source.limit : undefined,
    search: source.search,
    sortBy: source.sortBy,
    sortDir: source.sortDir,
    filters: source.extra,
    groupBy: source.groupBy,
  };
}
