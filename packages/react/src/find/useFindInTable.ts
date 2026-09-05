/**
 * The find bar's state: the query, the hits, and which one you are on.
 *
 * It knows nothing about focus. The shell moves focus to the current match
 * through the grid it already has, which keeps this hook pure enough to test
 * without a DOM and stops two pieces of code owning "where the table is
 * looking".
 *
 * The query itself is shareable table state: a `find` URL param (beside `q`)
 * reopens the bar and restarts the walk at the first hit. The current-match
 * index stays ephemeral — the receiving page's data may differ.
 */
import type { CellRange } from "@adapttable/core";
import type { GridCell } from "@adapttable/core";
import { singleCellRange } from "@adapttable/core";
import { PARAM_FIND } from "@adapttable/core";
import { parseTableUrlState, updateTableUrlState } from "@adapttable/core";
import { findMatches, matchKeySet, stepMatch } from "@adapttable/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { ColumnDef } from "../columnDef";
import { type UrlStateAdapter, useResolvedAdapter } from "../url/adapter";

/**
 * Trailing debounce for writing the find query to the URL. Typing must not
 * spam `history.replaceState` (Safari caps ~100 calls / 30s); the bar itself
 * stays instant through local state.
 *
 * @public
 */
export const FIND_URL_WRITE_DEBOUNCE_MS = 150;

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

function readFindParam(search: string, namespace: string): string {
  const raw = parseTableUrlState(search, namespace).get(
    `${namespace}${PARAM_FIND}`
  );
  if (raw == null) return "";
  return raw.trim();
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
  const ns = urlKey ? `${urlKey}.` : "";
  const param = `${ns}${PARAM_FIND}`;
  const resolved = useResolvedAdapter(urlAdapter, urlSync ?? true);
  const search = useSyncExternalStore(
    (onChange) => resolved.subscribe(onChange),
    () => resolved.getSearch(),
    () => (urlAdapter ? urlAdapter.getSearch() : "")
  );
  const urlQuery = useMemo(
    () => (enabled ? readFindParam(search, ns) : ""),
    [enabled, search, ns]
  );

  const [open, setOpen] = useState(() => urlQuery !== "");
  const [query, setQuery] = useState(() => urlQuery);
  const [index, setIndex] = useState(() => (urlQuery !== "" ? 0 : -1));
  const [pending, setPending] = useState<string | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `setOpen(true)` then `setQuery(...)` in one turn must persist: the render
  // that produced `open` is still the closed one.
  const openRef = useRef(open);
  openRef.current = open;
  // Last URL value we have already reacted to. Local typing while the bar is
  // closed must not look like an external URL change.
  const seenUrlQuery = useRef(urlQuery);

  const persist = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      seenUrlQuery.current = trimmed;
      resolved.setSearch(
        updateTableUrlState(resolved.getSearch(), ns, (params) => {
          if (trimmed !== "") params.set(param, trimmed);
          else params.delete(param);
        }),
        // Typing must never push history. The adapter default is replace;
        // passing it keeps a custom adapter from treating silence as push.
        { push: false }
      );
    },
    [resolved, ns, param]
  );

  const schedulePersist = useCallback(
    (next: string) => {
      setPending(next.trim());
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        persist(next);
        setPending(null);
      }, FIND_URL_WRITE_DEBOUNCE_MS);
    },
    [persist]
  );

  // Saved Views / back-forward / shared links: adopt the URL when we are not
  // mid-keystroke. Pending writes win until they flush. A closed bar that
  // holds a local query (never persisted) is not an external URL change.
  useEffect(() => {
    if (!enabled || pending !== null) return;
    if (urlQuery === seenUrlQuery.current) {
      if (urlQuery !== "" && !open) setOpen(true);
      return;
    }
    seenUrlQuery.current = urlQuery;
    if (urlQuery === query.trim()) {
      if (urlQuery !== "" && !open) setOpen(true);
      return;
    }
    setQuery(urlQuery);
    setOpen(urlQuery !== "");
    setIndex(urlQuery !== "" ? 0 : -1);
  }, [enabled, urlQuery, pending, query, open]);

  const writeQuery = useCallback(
    (next: string) => {
      setQuery(next);
      // A new query starts the walk again: staying on hit 9 of the last search
      // would land the user somewhere unrelated.
      setIndex(next.trim() === "" ? -1 : 0);
      if (!enabled) return;
      // Persist while the bar is open, or when clearing (close drops the param).
      // A closed bar that somehow receives keystrokes must not reopen via URL.
      if (openRef.current || next.trim() === "") schedulePersist(next);
    },
    [enabled, schedulePersist]
  );

  const writeOpen = useCallback(
    (next: boolean) => {
      openRef.current = next;
      setOpen(next);
      // Closing clears the query, so reopening starts clean and no cell stays
      // marked behind a bar that is no longer on screen.
      if (!next) writeQuery("");
    },
    [writeQuery]
  );

  const matches = useMemo(
    () =>
      enabled && open
        ? findMatches({ query, rows, columns, firstRowIndex })
        : [],
    [enabled, open, query, rows, columns, firstRowIndex]
  );
  const matchKeys = useMemo(() => matchKeySet(matches), [matches]);

  const step = useCallback(
    (by: number) => {
      setIndex((current) => stepMatch(current, matches.length, by));
    },
    [matches.length]
  );
  const openBar = useCallback(() => {
    writeOpen(true);
  }, [writeOpen]);
  const next = useCallback(() => {
    step(1);
  }, [step]);
  const previous = useCallback(() => {
    step(-1);
  }, [step]);

  const latestRef = useRef<{
    pending: string | null;
    persist: typeof persist;
  }>({ pending, persist });
  latestRef.current = { pending, persist };
  useEffect(
    () => () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        const { pending: last, persist: write } = latestRef.current;
        write(last ?? "");
      }
    },
    []
  );

  // The walk can outlive its target: typing narrows the hits, and a row can
  // leave the window on the next page. Clamp rather than pointing at nothing.
  const safeIndex =
    matches.length === 0
      ? -1
      : Math.min(Math.max(index, 0), matches.length - 1);

  return useMemo(
    () => ({
      open: enabled && open,
      setOpen: writeOpen,
      query,
      setQuery: writeQuery,
      matches,
      matchKeys,
      index: safeIndex,
      current: safeIndex === -1 ? null : (matches[safeIndex] ?? null),
      next,
      previous,
      openBar: enabled ? openBar : undefined,
    }),
    [
      enabled,
      open,
      writeOpen,
      query,
      writeQuery,
      matches,
      matchKeys,
      safeIndex,
      next,
      previous,
      openBar,
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
