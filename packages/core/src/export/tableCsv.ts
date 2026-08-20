import type { ReactNode } from "react";

import {
  ACTIONS_COLUMN_KEY,
  REORDER_COLUMN_KEY,
} from "../columns/columnMenuModel";
import { type CellRange, cellRangeIndices } from "../focus/cellRange";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { GetCellSpan } from "../rows/cellSpan";
import type { TableSource } from "../source/TableSource";
import type { TreeEntry } from "../tree/treeRows";
import type { ColumnDef, ExtraFilters, SortDirection } from "../types";
import { devWarn } from "../utils/devWarn";
import {
  exportViewFromChrome,
  filterExportView,
  summaryExportValues,
} from "./exportView";
import {
  buildExportTable,
  csvWriter,
  defaultExportFilename,
  downloadExportFile,
  type ExportPayload,
  type ExportWriter,
} from "./exportWriter";

/** Which rows an export covers. */
export type ExportRowScope = "page" | "all" | "selected" | "range";

/**
 * Which columns an export covers: what the user can see, every defined
 * column, or an explicit list of keys in file order.
 */
export type ExportColumnScope = "visible" | "all" | readonly string[];

/** Opt-in CSV export config for the shared DataTable surface. */
export interface ExportCsvOptions<TRow = unknown> {
  /** Download filename. Defaults to `"export.csv"`. */
  filename?: string;
  /**
   * Which rows the file contains.
   *
   * `"page"` (default) — current page / loaded slice.
   * `"all"` — full filtered+sorted set when the source exposes
   * {@link TableSource.allFilteredRows}; otherwise falls back to the
   * page with a dev-only warning.
   * `"selected"` — the checked rows, in table order. Selection is a set of
   * ids, so this searches the widest set the source can offer: a row selected
   * on page 1 is still exported while page 3 is on screen.
   * `"range"` — the highlighted cell rectangle, which needs `cellNavigation`;
   * a rectangle names its own columns, so it decides them and `columns` is not
   * consulted. Without a selection this falls back to the page with a dev-only
   * warning.
   */
  scope?: ExportRowScope;
  /**
   * Which columns the file contains.
   *
   * `"visible"` (default) — what the user can see, so the file matches the
   * screen. `"all"` — every defined column including those hidden through the
   * column menu, for a complete extract. An explicit array picks columns by
   * key, in the order given, and silently ignores a key that matches no
   * column so a stale saved config cannot break the button.
   *
   * The synthetic actions column is never exported under any of them.
   */
  columns?: ExportColumnScope;
  /**
   * Neutralise spreadsheet formula injection (see
   * {@link RowsToCsvOptions.escapeFormulas}). Disable ONLY for
   * machine-consumed output that is never opened in a spreadsheet.
   * @defaultValue true
   */
  escapeFormulas?: boolean;
  /**
   * Runs after the rows and columns are chosen and before the file is
   * written, which is the only moment where both are known and nothing has
   * happened yet.
   *
   * Return `false` to cancel the export — enough is known here to decide
   * (too many rows, nothing selected, a permission the host enforces).
   * Return `{ filename }` to name the file from the data, which is what most
   * callers want it for. Return nothing to continue unchanged.
   */
  onBeforeExport?: (
    info: ExportInfo<TRow>
  ) => boolean | void | { filename?: string };
  /**
   * Runs once the file has been handed to the browser, with what was written.
   * For analytics, a toast, or keeping a copy.
   *
   * `csv` is the file's text; a binary format leaves it empty and carries its
   * bytes in `file.parts`.
   */
  onAfterExport?: (
    info: ExportInfo<TRow> & { csv: string; file: ExportPayload }
  ) => void;
  /**
   * The file format. Defaults to CSV; `@adapttable/core/xlsx` exports
   * {@link ExportWriter | a spreadsheet writer}, and any function of the
   * resolved rows and columns is a valid one.
   *
   * The scope options above are unaffected by this — which rows and columns
   * leave the table is decided before a writer sees them.
   */
  writer?: ExportWriter;
  /**
   * Hand the export to your backend instead of building the file in the
   * browser.
   *
   * Past a certain size the browser is the wrong place to do this: the rows
   * are not all loaded, holding them would cost more memory than the tab has,
   * and the work blocks the main thread. With this set, the button sends the
   * user's current view — filters, search, sort, the chosen scope — to your
   * handler, and building the file (or queueing a job and emailing a link)
   * happens where the data already lives.
   *
   * The table builds no file and downloads nothing when this is present.
   * Return a promise and the button stays busy until it settles, so a second
   * click cannot start the same export twice.
   */
  request?: (info: ExportRequest<TRow>) => void | Promise<void>;
  /**
   * Let `scope: "all"` page a server source itself.
   *
   * A server-backed table holds one page, so "all" has nothing to read. The
   * first answer is {@link ExportCsvOptions.request} — the backend already has
   * the data. This is the second: opt in and the table walks the query page by
   * page and builds the file in the browser.
   *
   * It is opt-in because it is a loop of network requests the reader did not
   * ask for, and capped because an unbounded one over a large table is a way
   * to hang a tab. Past {@link FetchAllExport.maxRows} the export stops and
   * says so through {@link FetchAllExport.onCapped} rather than quietly
   * writing a partial file.
   */
  fetchAll?: FetchAllExport<TRow>;
}

/** How `scope: "all"` pages a server source when the host opts in. */
export interface FetchAllExport<TRow> {
  /**
   * Fetch one page of the current query. Called with 1-based page numbers
   * until it returns fewer rows than `limit`, or the cap is reached.
   */
  fetchPage: (query: ExportQuery) => Promise<readonly TRow[]>;
  /** Rows per request. Defaults to the table's current page size. */
  pageSize?: number;
  /**
   * Stop after this many rows. Defaults to 50,000 — high enough that ordinary
   * tables never meet it, low enough that a runaway query cannot exhaust the
   * tab.
   */
  maxRows?: number;
  /**
   * Called when the cap stopped the export short, with what was written and
   * the cap that stopped it. Tell the reader; a silently truncated file is the
   * outcome this whole option exists to avoid.
   */
  onCapped?: (info: { rows: number; maxRows: number }) => void;
}

/** The default {@link FetchAllExport.maxRows}. */
export const EXPORT_FETCH_ALL_MAX_ROWS = 50_000;

/**
 * Walk a server source page by page for `scope: "all"`.
 *
 * @typeParam TRow - The row type.
 * @param source - The table's source, for the current query and page size.
 * @param config - See {@link FetchAllExport}.
 * @returns Every row the query matches, up to the cap.
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

/** The view an export was asked for, as a server needs to hear it. */
export interface ExportRequest<TRow> extends ExportInfo<TRow> {
  /**
   * The query behind the current view: search, filters, sort and paging,
   * exactly as {@link TableQuery} carries them to a server tier.
   */
  query: ExportQuery;
  /** Which rows were asked for. `rows` holds what the browser has of them. */
  scope: ExportRowScope;
  /**
   * The file extension the button would have produced — `"csv"`, `"xlsx"`, or
   * whatever a custom writer names itself. A backend building the file needs to
   * know which one, and the filename alone is a guess.
   */
  format: string;
}

/** The view-defining half of a table query, for an export request. */
export interface ExportQuery {
  /**
   * Undefined for `scope: "all"`: "all" means every row the filters match, so
   * a page number would contradict the ask. Present for every other scope.
   */
  page: number | undefined;
  /** Undefined for `scope: "all"` — see {@link ExportQuery.page}. */
  limit: number | undefined;
  search: string;
  sortBy: string | undefined;
  sortDir: SortDirection | undefined;
  filters: ExtraFilters;
  groupBy: string | undefined;
}

/** What an export lifecycle hook is told about the file being written. */
export interface ExportInfo<TRow> {
  /** The rows the chosen scope resolved to, in table order. */
  rows: readonly TRow[];
  /** The columns the chosen scope resolved to, in file order. */
  columns: readonly ColumnDef<TRow>[];
  /** The filename as it stands, before any override this hook returns. */
  filename: string;
}

/** Resolve a boolean-or-options prop into a concrete config, or `null` when off. */
export function resolveExportCsv<TRow = unknown>(
  value: boolean | ExportCsvOptions<TRow> | undefined
): ExportCsvOptions<TRow> | null {
  if (!value) return null;
  if (value === true) return {};
  return value;
}

/**
 * Whether `scope: "all"` will write the current page instead of the
 * full filtered set.
 *
 * A frontend source that exposes `allFilteredRows`, or a host that
 * passed `request` / `fetchAll`, can answer honestly. Everything else
 * is this page — the button should say so.
 */
export function exportAllFallsBackToPage<TRow = unknown>(
  exportCsv: boolean | ExportCsvOptions<TRow> | undefined,
  source: Pick<TableSource<TRow>, "allFilteredRows">
): boolean {
  const options = resolveExportCsv(exportCsv);
  return Boolean(
    options?.scope === "all" &&
    source.allFilteredRows === undefined &&
    options.request === undefined &&
    options.fetchAll === undefined
  );
}

/** Columns that belong in a CSV (drop synthetic actions and reorder columns). */
export function exportableColumns<TRow>(
  columns: readonly ColumnDef<TRow>[]
): ColumnDef<TRow>[] {
  return columns.filter(
    (column) =>
      column.key !== ACTIONS_COLUMN_KEY && column.key !== REORDER_COLUMN_KEY
  );
}

/**
 * Everything an export needs beyond the visible columns: the selection to
 * honour a `"selected"` scope, and the full column set to honour `"all"`.
 *
 * Every field is optional. A caller that passes none gets exactly the
 * behaviour this function always had.
 */
export interface ExportContext<TRow> {
  /** The checked row ids. */
  selectedIds?: ReadonlySet<string>;
  /** How a row's id is derived — the table's own `getRowId`. */
  getRowId?: (row: TRow) => string;
  /** Every defined column, including any hidden through the column menu. */
  allColumns?: readonly ColumnDef<TRow>[];
  /** The highlighted cell rectangle, for `scope: "range"`. */
  range?: CellRange | null;
  /**
   * Where the rendered window starts in the dataset — the offset that turns a
   * range's absolute row addresses back into rows the browser holds. Zero
   * unless the table is paged.
   */
  firstRowIndex?: number;
  /** Omit covered cells from the file — a span exports its value once. */
  getCellSpan?: GetCellSpan<TRow>;
  /**
   * The grouping model's entries, when grouping is armed. A spreadsheet
   * writes headers, outline levels and footers from them. A range export
   * ignores this — a rectangle is already its own shape.
   */
  grouping?: { entries: readonly GroupedFlatEntry<TRow>[] };
  /**
   * The flattened tree, when a tree is armed. Outranks grouping, the same
   * way the table does.
   */
  tree?: {
    entries: readonly TreeEntry<TRow>[];
    /**
     * The same hierarchy with every node open. A folded folder is display
     * state, so `scope: "all"` writes what is inside it — without this, a
     * collapsed subtree is silently missing from the file.
     */
    allEntries?: readonly TreeEntry<TRow>[];
  };
  /** Caption for a group footer — the table's `labels.groupTotal`. */
  groupTotal?: (label: string) => string;
  /**
   * The table's `summaryRow` mapper. Called on the scoped rows so a grand
   * total in the file matches the rows that actually left.
   */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
}

/** Pick the column set an export scope asks for, minus the actions column. */
export function resolveExportColumns<TRow>(
  scope: ExportColumnScope | undefined,
  visible: readonly ColumnDef<TRow>[],
  all: readonly ColumnDef<TRow>[] | undefined
): ColumnDef<TRow>[] {
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
        'exportCsv scope "all" needs the full filtered set. This source exposes only the current page, so that is what is exported. Pass `request` or `fetchAll` to export everything from a server tier.'
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

/**
 * What an export resolves to: the rows a scope asks for and the columns a
 * scope asks for.
 *
 * Three call sites need exactly this pair — the pure builder, the download
 * path (which brackets it with hooks) and the backend-request path (which
 * sends it instead of writing a file). Resolving it once is what keeps them
 * from drifting apart.
 */
function resolveExport<TRow>(options: {
  source: TableSource<TRow>;
  columns: readonly ColumnDef<TRow>[];
  scope?: ExportRowScope;
  columnScope?: ExportColumnScope;
  context?: ExportContext<TRow>;
}): { rows: readonly TRow[]; columns: ColumnDef<TRow>[] } {
  const scope = options.scope ?? "page";
  const range = options.context?.range;
  return {
    rows: resolveExportRows(scope, options.source, options.context),
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
  columns: readonly ColumnDef<TRow>[]
): ColumnDef<TRow>[] {
  return exportableColumns(
    cellRangeIndices(range).cols.flatMap((index) => {
      const column = columns[index];
      return column ? [column] : [];
    })
  );
}

/** Structure and spans for the resolved rows, when the context has them. */
function exportTableOptions<TRow>(
  rows: readonly TRow[],
  scope: ExportRowScope | undefined,
  context: ExportContext<TRow> | undefined
) {
  const getRowId = context?.getRowId;
  // Page writes the chrome view as it stands — collapsed headers stay,
  // folded leaves stay out. All / selected unfold those leaves first so a
  // ticked row inside a closed group still leaves the table, then prune.
  const includeHiddenLeaves = scope === "all" || scope === "selected";
  const fullView = exportViewFromChrome({
    grouping: context?.grouping,
    tree: context?.tree,
    groupTotal: context?.groupTotal,
    includeHiddenLeaves,
  });
  let view = fullView;
  if (scope === "range" || !fullView) view = undefined;
  else if (includeHiddenLeaves && getRowId) {
    view = filterExportView(
      fullView,
      new Set(rows.map((row) => getRowId(row))),
      getRowId
    );
  }
  return {
    getCellSpan: context?.getCellSpan,
    firstRowIndex: context?.firstRowIndex,
    view,
    summary: summaryExportValues(context?.summaryRow?.(rows)),
  };
}

/**
 * Build CSV text for the chosen row and column scopes.
 *
 * @typeParam TRow - The row type.
 */
export function buildTableCsv<TRow>(options: {
  source: TableSource<TRow>;
  columns: readonly ColumnDef<TRow>[];
  scope?: ExportRowScope;
  columnScope?: ExportColumnScope;
  escapeFormulas?: boolean;
  context?: ExportContext<TRow>;
}): string {
  const { rows, columns } = resolveExport(options);
  return csvWriter.build({
    table: buildExportTable(
      rows,
      columns,
      exportTableOptions(rows, options.scope, options.context)
    ),
    filename: "export.csv",
    escapeFormulas: options.escapeFormulas,
  }).text;
}

/**
 * Build + download a file for the current table view. CSV unless a `writer`
 * says otherwise.
 *
 * @typeParam TRow - The row type.
 */
export function downloadTableCsv<TRow>(options: {
  source: TableSource<TRow>;
  columns: readonly ColumnDef<TRow>[];
  filename?: string;
  scope?: ExportRowScope;
  columnScope?: ExportColumnScope;
  escapeFormulas?: boolean;
  context?: ExportContext<TRow>;
  writer?: ExportWriter;
  onBeforeExport?: NonNullable<ExportCsvOptions<TRow>["onBeforeExport"]>;
  onAfterExport?: NonNullable<ExportCsvOptions<TRow>["onAfterExport"]>;
}): void {
  const { rows, columns } = resolveExport(options);
  const writer = options.writer ?? csvWriter;

  let filename = options.filename ?? defaultExportFilename(writer);
  const decision = options.onBeforeExport?.({ rows, columns, filename });
  if (decision === false) return;
  if (decision && decision !== true && decision.filename) {
    filename = decision.filename;
  }

  // Built after the hook, so a filename the hook chose reaches a writer that
  // embeds it — and so a cancelled export builds nothing at all.
  const file = writer.build({
    table: buildExportTable(
      rows,
      columns,
      exportTableOptions(rows, options.scope, options.context)
    ),
    filename,
    escapeFormulas: options.escapeFormulas,
  });
  downloadExportFile(filename, file);
  options.onAfterExport?.({ rows, columns, filename, csv: file.text, file });
}

/**
 * Resolve the `exportCsv` prop into a click handler, or `undefined` when off.
 * Adapters bind this to the toolbar Export button.
 *
 * @typeParam TRow - The row type.
 */
export function makeExportCsvHandler<TRow>(
  exportCsv: boolean | ExportCsvOptions<TRow> | undefined,
  source: TableSource<TRow>,
  columns: readonly ColumnDef<TRow>[],
  context?: ExportContext<TRow>
): (() => void | Promise<void>) | undefined {
  const options = resolveExportCsv(exportCsv);
  if (!options) return undefined;

  // Handing the export to a backend replaces building it here entirely —
  // the browser neither assembles a file nor downloads one.
  const writer = options.writer ?? csvWriter;
  const { request } = options;
  if (request) {
    return () =>
      request({
        ...resolveExport({
          source,
          columns,
          scope: options.scope,
          columnScope: options.columns,
          context,
        }),
        filename: options.filename ?? defaultExportFilename(writer),
        scope: options.scope ?? "page",
        format: writer.extension,
        query: exportQueryOf(source, options.scope ?? "page"),
      });
  }

  // "All" over a server source: the browser holds one page, so it has to be
  // answered by fetching, not by pretending. `fetchAll` is the opt-in.
  const serverAll =
    options.scope === "all" && !source.allFilteredRows && options.fetchAll;
  if (serverAll) {
    return async () => {
      const rows = await fetchAllExportRows(source, serverAll);
      downloadTableCsv({
        source: { ...source, allFilteredRows: rows },
        columns,
        filename: options.filename,
        scope: "all",
        columnScope: options.columns,
        escapeFormulas: options.escapeFormulas,
        context,
        writer,
        onBeforeExport: options.onBeforeExport,
        onAfterExport: options.onAfterExport,
      });
    };
  }

  // Neither a backend handler nor an opt-in fetch, and no rows to read:
  // write this page and name the button that way. Hiding the control left
  // only a console warning; the person at the table should see "this page".
  if (options.scope === "all" && !source.allFilteredRows) {
    devWarn(
      'exportCsv scope "all" needs the full filtered set. This source ' +
        "exposes only the current page, so the Export button writes this " +
        "page and names itself that way. Pass `request` or `fetchAll` to " +
        "export everything from a server tier."
    );
    return () =>
      downloadTableCsv({
        source,
        columns,
        filename: options.filename,
        scope: "page",
        columnScope: options.columns,
        escapeFormulas: options.escapeFormulas,
        context,
        writer,
        onBeforeExport: options.onBeforeExport,
        onAfterExport: options.onAfterExport,
      });
  }

  return () =>
    downloadTableCsv({
      source,
      columns,
      filename: options.filename,
      scope: options.scope,
      columnScope: options.columns,
      escapeFormulas: options.escapeFormulas,
      context,
      writer,
      onBeforeExport: options.onBeforeExport,
      onAfterExport: options.onAfterExport,
    });
}

/** The view-defining half of the source's state, for a server export. */
function exportQueryOf<TRow>(
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
