/**
 * The find bar — the React binding.
 *
 * Core's find controller owns whether the bar is open, the query and the
 * walk, and writes the query to the URL through a debounce. This hook
 * subscribes to it, derives the hits over the rows it is given, and leaves
 * focus to the shell, which moves it to the current match through the grid it
 * already has.
 */
import {
  type CellRange,
  clampMatchIndex,
  createFindController,
  findMatches,
  type GridCell,
  matchKeySet,
  singleCellRange,
} from "@adapttable/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { ColumnDef } from "../columnDef";
import { type UrlStateAdapter, useResolvedAdapter } from "../url/adapter";

export { FIND_URL_WRITE_DEBOUNCE_MS } from "@adapttable/core";

/**
 * What `useFindInTable` needs.
 *
 * @public
 */
export interface UseFindInTableOptions<TRow> {
  /** Off unless the host asked for it; when false nothing is searched. */
  enabled: boolean;
  /** The rows the browser holds, in table order. */
  rows: readonly TRow[];
  /** The columns as rendered. */
  columns: readonly ColumnDef<TRow>[];
  /** Where the rendered window starts in the dataset. Zero unless paged. */
  firstRowIndex?: number;
  /** URL-state backend. Defaults to the browser History API. */
  urlAdapter?: UrlStateAdapter;
  /** When `false`, keep the query in a local memory store. Defaults `true`. */
  urlSync?: boolean;
  /** Namespace, when several tables share one URL (`lab.find`). */
  urlKey?: string;
}

/**
 * What `useFindInTable` returns.
 *
 * @public
 */
export interface FindInTableState {
  /** Whether the bar is showing. */
  open: boolean;
  /** Show or hide the bar. Hiding clears the query, as a find bar does. */
  setOpen: (open: boolean) => void;
  /** The current query. */
  query: string;
  /** Type into the find bar. Resets the walk to the first hit. */
  setQuery: (query: string) => void;
  /** Every matching cell, in reading order. */
  matches: readonly GridCell[];
  /** Their keys, for marking cells as this render walks them. */
  matchKeys: ReadonlySet<string>;
  /** Which match the walk is on, from zero; `-1` when there are none. */
  index: number;
  /** The cell the walk is on, or `null`. */
  current: GridCell | null;
  /** Step to the next hit, wrapping at the end. */
  next: () => void;
  /** Step to the previous hit, wrapping at the start. */
  previous: () => void;
  /**
   * Open the bar — what Ctrl/Cmd+F and a host's own button call. `undefined`
   * when the feature is off, so the shortcut stays the BROWSER'S rather than
   * being swallowed by a table that has no bar to show.
   */
  openBar?: () => void;
}

/**
 * Find state over the loaded rows.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseFindInTableOptions}.
 * @returns The state; inert with `enabled` false.
 *
 * @public
 */
export function useFindInTable<TRow>(
  options: UseFindInTableOptions<TRow>
): FindInTableState {
  const {
    enabled,
    rows,
    columns,
    firstRowIndex = 0,
    urlAdapter,
    urlSync,
    urlKey,
  } = options;
  const adapter = useResolvedAdapter(urlAdapter, urlSync ?? true);
  const search = useSyncExternalStore(
    (onChange) => adapter.subscribe(onChange),
    () => adapter.getSearch(),
    () => (urlAdapter ? urlAdapter.getSearch() : "")
  );
  const [controller] = useState(() =>
    createFindController({ enabled, adapter, urlKey })
  );
  controller.configure({ enabled, adapter, urlKey });
  const { open, query, index, pending } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );

  // Saved Views / back-forward / shared links: adopt the URL when no typed
  // query is waiting to be written.
  useEffect(() => {
    controller.syncFromUrl();
  }, [controller, enabled, search, pending, query, open]);

  useEffect(() => controller.connect(), [controller]);

  const matches = useMemo(
    () =>
      enabled && open
        ? findMatches({ query, rows, columns, firstRowIndex })
        : [],
    [enabled, open, query, rows, columns, firstRowIndex]
  );
  const matchKeys = useMemo(() => matchKeySet(matches), [matches]);

  const next = useCallback(() => {
    controller.step(1, matches.length);
  }, [controller, matches.length]);
  const previous = useCallback(() => {
    controller.step(-1, matches.length);
  }, [controller, matches.length]);

  const safeIndex = clampMatchIndex(index, matches.length);

  return useMemo(
    () => ({
      open: enabled && open,
      setOpen: controller.setOpen,
      query,
      setQuery: controller.setQuery,
      matches,
      matchKeys,
      index: safeIndex,
      current: safeIndex === -1 ? null : (matches[safeIndex] ?? null),
      next,
      previous,
      openBar: enabled ? controller.openBar : undefined,
    }),
    [
      controller,
      enabled,
      open,
      query,
      matches,
      matchKeys,
      safeIndex,
      next,
      previous,
    ]
  );
}

/**
 * Take the table's focus to whichever match the walk is on.
 *
 * Highlighting alone is not finding: with 500 rows rendered, the hit is
 * usually off-screen, so the walk moves focus — which scrolls the cell into
 * view, announces it, and leaves it selected. Both the shell and the antd
 * adapter wire find this way, and this is the one place that rule lives.
 *
 * @param current - The match the walk is on, or `null`.
 * @param focusCell - The grid's `focusCell`.
 * @param selectRange - The grid's `selectRange`.
 *
 * @public
 */
export function useFindFocus(
  current: GridCell | null,
  focusCell: (cell: GridCell) => void,
  selectRange: (range: CellRange | null) => void
): void {
  useEffect(() => {
    if (!current) return;
    focusCell(current);
    selectRange(singleCellRange(current));
  }, [current, focusCell, selectRange]);
}
