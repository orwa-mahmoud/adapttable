/**
 * Export selection contracts.
 *
 * Which rows and columns an export covers, and the request a server is
 * handed. No file bytes and no row walking live here.
 */

import type {
  ColumnMetadata,
  ExtraFilters,
  SortDirection,
} from "../contracts/columns";
import type { QueryFilterGroup, SortLevel } from "../contracts/query";
import type { DisplayValue } from "../display";
import type { CellRange } from "../focus/cellRange";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { GetCellSpan } from "../rows/cellSpan";
import type { TreeEntry, TreeShape } from "../tree/treeRows";
import type { ExportPayload, ExportWriter } from "./exportWriter";

/**
 * Which rows an export covers.
 *
 * @public
 */
export type ExportRowScope = "page" | "all" | "selected" | "range";

/**
 * Which columns an export covers: what the user can see, every defined
 * column, or an explicit list of keys in file order.
 *
 * @public
 */
export type ExportColumnScope = "visible" | "all" | readonly string[];

/**
 * Opt-in CSV export config for the shared DataTable surface.
 *
 * @public
 */
export interface ExportCsvOptions<TRow = unknown> {
  /**
   * Download filename. Defaults to `export.` plus the writer's extension —
   * `"export.csv"` for the built-in CSV writer.
   */
  filename?: string;
  /**
   * Which rows the file contains.
   *
   * `"page"` (default) — current page / loaded slice.
   * `"all"` — full filtered+sorted set when the source exposes
   * {@link TableSource.allFilteredRows}. A server source instead needs
   * {@link ExportCsvOptions.onExportAll}, {@link ExportCsvOptions.request}, or
   * {@link ExportCsvOptions.fetchAll}; without an executable route the export
   * stays disabled.
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
   * `RowsToCsvOptions.escapeFormulas`). Disable ONLY for
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
   * Build an all-rows export where the data already lives.
   *
   * This route is used only with `scope: "all"`. It receives a page-free,
   * transport-safe snapshot of the current view and never asks the table to
   * fetch or materialise the matching rows. Report progress or a status
   * message through `controls`; honouring its signal makes the progress
   * surface's Cancel action stop the host job.
   *
   * Resolve `{ url }` and the completed surface offers that URL as a download.
   * Resolve nothing when the host delivered the file another way. Reject to
   * show the localized failure state and a Retry action.
   */
  onExportAll?: (
    query: ExportAllQuery,
    controls: ExportAllControls
  ) => ExportAllResult | Promise<ExportAllResult>;
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
   * first answer is {@link ExportCsvOptions.onExportAll} — the backend already
   * has the data. This is the second: opt in and the table walks the query page
   * by page and builds the file in the browser.
   *
   * It is opt-in because it is a loop of network requests the reader did not
   * ask for, and capped because an unbounded one over a large table is a way
   * to hang a tab. Past {@link FetchAllExport.maxRows} the export stops and
   * says so through {@link FetchAllExport.onCapped} rather than quietly
   * writing a partial file.
   */
  fetchAll?: FetchAllExport<TRow>;
}

/**
 * How `scope: "all"` pages a server source when the host opts in.
 *
 * @public
 */
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

/**
 * The default {@link FetchAllExport.maxRows}.
 *
 * @public
 */
export const EXPORT_FETCH_ALL_MAX_ROWS = 50_000;

/**
 * The view an export was asked for, as a server needs to hear it.
 *
 * @public
 */
export interface ExportRequest<TRow> extends ExportInfo<TRow> {
  /**
   * The query behind the current view: search, filters, sort and paging,
   * exactly as `TableQuery` carries them to a server tier.
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

/**
 * A server-built all-rows export's page-free view.
 *
 * Every field is plain transport data. In particular, columns are keys rather
 * than `ColumnMetadata` objects, because definitions may contain React nodes and
 * functions that cannot cross a network boundary.
 *
 * @public
 */
export interface ExportAllQuery {
  /** The committed free-text search term. */
  readonly search: string;
  /** Active primary sort key, if any. */
  readonly sortBy: string | undefined;
  /** Direction for `sortBy`. */
  readonly sortDir: SortDirection | undefined;
  /** The complete multi-sort chain, in priority order. */
  readonly sortLevels: readonly SortLevel[];
  /** Active flat filter values. */
  readonly filters: ExtraFilters;
  /** Active nested AND/OR filters, when present. */
  readonly filterTree: QueryFilterGroup | undefined;
  /** Active grouping keys, outermost first. */
  readonly groupBy: readonly string[];
  /** Column keys requested for the file, in file order. */
  readonly columns: readonly string[];
  /** Column keys visible on screen, in display order. */
  readonly visibleColumns: readonly string[];
  /** The requested file format. */
  readonly format: string;
  /** The requested filename. */
  readonly filename: string;
}

/**
 * Controls the table gives a server-built export.
 *
 * @public
 */
export interface ExportAllControls {
  /** Aborted when the reader chooses Cancel. */
  readonly signal: AbortSignal;
  /** Report determinate completion from 0 through 100. */
  readonly setProgress?: (progress: number) => void;
  /** Report a short host-owned status message. */
  readonly setMessage?: (message: string) => void;
}

/**
 * How a server-built export settles.
 *
 * Resolve a URL for the table to offer as a download, or resolve nothing when
 * the host delivered the file itself.
 *
 * @public
 */
export type ExportAllResult = { readonly url: string } | void;

/**
 * The view-defining half of a table query, for an export request.
 *
 * @public
 */
export interface ExportQuery {
  /**
   * Undefined for `scope: "all"`: "all" means every row the filters match, so
   * a page number would contradict the ask. Present for every other scope.
   */
  page: number | undefined;
  /** Undefined for `scope: "all"` — see {@link ExportQuery.page}. */
  limit: number | undefined;
  /** The free-text search term, as typed. */
  search: string;
  /** Column key currently sorted by, if any. */
  sortBy: string | undefined;
  /** Direction for `sortBy`. */
  sortDir: SortDirection | undefined;
  /** The active filter values. */
  filters: ExtraFilters;
  /** Column key rows are grouped on. */
  groupBy: string | undefined;
}

/**
 * What an export lifecycle hook is told about the file being written.
 *
 * @public
 */
export interface ExportInfo<TRow> {
  /**
   * The rows the chosen scope resolved to, in table order. Page metadata
   * retains source.rows, even when a tree writer includes visible children.
   */
  rows: readonly TRow[];
  /** The columns the chosen scope resolved to, in file order. */
  columns: readonly ColumnMetadata<TRow>[];
  /** The filename as it stands, before any override this hook returns. */
  filename: string;
}

/**
 * Boolean-or-options CSV export prop (off / on / configured).
 *
 * @public
 */
export type ExportCsvProp<TRow = unknown> =
  boolean | ExportCsvOptions<TRow> | undefined;

/**
 * Everything an export needs beyond the visible columns: the selection to
 * honour a `"selected"` scope, and the full column set to honour `"all"`.
 *
 * Every field is optional. A caller that passes none gets exactly the
 * behaviour this function always had.
 *
 * @public
 */
export interface ExportContext<TRow> {
  /** The checked row ids. */
  selectedIds?: ReadonlySet<string>;
  /** How a row's id is derived — the table's own `getRowId`. */
  getRowId?: (row: TRow) => string;
  /** Every defined column, including any hidden through the column menu. */
  allColumns?: readonly ColumnMetadata<TRow>[];
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
  grouping?: {
    /** Active grouping keys, outermost first. */
    groupBy?: readonly string[];
    entries: readonly GroupedFlatEntry<TRow>[];
  };
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
    /**
     * Nested data: read loaded descendants from the scope's source roots.
     * Together with getRowId, lets all / selected include off-page children.
     * No lazy children are fetched. Without shape readers, exports retain
     * the existing entries-only scope filtering.
     */
    getChildren?: NonNullable<TreeShape<TRow>["getChildren"]>;
    /**
     * Flat data: reconstruct ancestry within the scope's source rows.
     * Filtered-out rows are never recovered from stale tree entries.
     */
    getParentId?: NonNullable<TreeShape<TRow>["getParentId"]>;
  };
  /** Caption for a group footer — the table's `labels.groupTotal`. */
  groupTotal?: (label: string) => string;
  /**
   * The table's `summaryRow` mapper, called on the original source rows for
   * the scope, before tree expansion. Nested roots can already carry rollup
   * totals, so adding their descendants here would count those values twice.
   * A selected child absent from the raw source array does not contribute to
   * this input; the mapper retains the source's shape and summary semantics.
   */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, DisplayValue>>;
}
