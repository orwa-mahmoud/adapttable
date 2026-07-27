import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  type ColumnLayoutState,
  EMPTY_COLUMN_LAYOUT,
} from "../columns/useColumnLayout";
import { stableKey } from "../utils/stableKey";
import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";
import {
  PARAM_COL_HIDDEN,
  readColumnLayout,
  writeColumnLayout,
} from "./serialize";

/** Options for {@link useColumnLayoutUrlState}. */
export interface UseColumnLayoutUrlStateOptions {
  /** URL-state backend. Defaults to the browser History API. */
  urlAdapter?: UrlStateAdapter;
  /** Alias for `urlAdapter` (v1 name) — deleted before the 2.0.0 release. */
  adapter?: UrlStateAdapter;
  /** When `false`, keep the layout in a local memory store. Defaults `true`. */
  urlSync?: boolean;
  /** Alias for `urlSync` (v1 name) — deleted before the 2.0.0 release. */
  enabled?: boolean;
  /** Layout applied when the URL carries no column layout yet. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  /** Alias for `defaultColumnLayout` (v1 name) — deleted before the 2.0.0 release. */
  defaultLayout?: Partial<ColumnLayoutState>;
  /**
   * Namespace for this table's params, so multiple tables can share one URL
   * (`left.colHide`, `right.colPin`, …). Omit for the bare keys.
   */
  urlKey?: string;
}

/**
 * Trailing debounce for URL persistence. A column-resize drag commits one
 * layout per animation frame; writing `history.replaceState` that often
 * trips Safari's rate limit (~100 calls per 30s, then it throws). Reads stay
 * instant via an optimistic overlay — only the URL write is deferred.
 */
export const LAYOUT_URL_WRITE_DEBOUNCE_MS = 150;

/** State + change handler returned by {@link useColumnLayoutUrlState}. */
export interface UseColumnLayoutUrlStateResult {
  /** Current layout — from the URL, or the default when the URL is empty. */
  layout: ColumnLayoutState;
  /** Persist a new layout into the URL. Wire to `onColumnLayoutChange`. */
  onLayoutChange: (next: ColumnLayoutState) => void;
}

/**
 * Headless URL-synced column layout. Mirrors {@link useTableUrlState} for the
 * column dimension: which columns are hidden, pinned, reordered, or resized is
 * kept in the query string (or a local store when disabled), so reloads,
 * shared links, and re-mounts restore the exact layout. Feed the result into
 * a table's `columnLayout` / `onColumnLayoutChange`.
 *
 * `defaultColumnLayout` applies only while the URL carries no layout. When the user
 * explicitly empties the layout (e.g. unhides the last default-hidden
 * column), an empty `colHide=` marker records that emptiness — deleting every
 * param would resurrect the default on the next read. A change back to the
 * exact default clears the params instead, keeping shared URLs clean.
 *
 * @param options - See {@link UseColumnLayoutUrlStateOptions}.
 * @returns The current layout and a change handler that persists it.
 */
export function useColumnLayoutUrlState(
  options: UseColumnLayoutUrlStateOptions = {}
): UseColumnLayoutUrlStateResult {
  const {
    urlAdapter,
    adapter,
    urlSync,
    enabled,
    defaultColumnLayout,
    defaultLayout,
    urlKey,
  } = options;
  const baseLayout = defaultColumnLayout ?? defaultLayout;
  const backend = urlAdapter ?? adapter;
  const syncToUrl = urlSync ?? enabled ?? true;
  const ns = urlKey ? `${urlKey}.` : "";

  const resolved = useResolvedAdapter(backend, syncToUrl);
  // Same SSR rule as useTableUrlState: only an explicit adapter is trusted
  // to be hydration-consistent; the default history adapter hydrates from "".
  const search = useSyncExternalStore(
    (onChange) => resolved.subscribe(onChange),
    () => resolved.getSearch(),
    () => (backend ? backend.getSearch() : "")
  );
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const fallback = useMemo<ColumnLayoutState>(
    () => ({ ...EMPTY_COLUMN_LAYOUT, ...baseLayout }),
    [baseLayout]
  );
  // Optimistic overlay: the most recent layout not yet flushed to the URL.
  const [pending, setPending] = useState<ColumnLayoutState | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const layout = useMemo<ColumnLayoutState>(
    () => pending ?? readColumnLayout(params, ns) ?? fallback,
    [pending, params, ns, fallback]
  );

  const persist = useCallback(
    (next: ColumnLayoutState) => {
      const p = new URLSearchParams(resolved.getSearch());
      const isDefault = stableKey(next) === stableKey(fallback);
      const isEmpty = stableKey(next) === stableKey(EMPTY_COLUMN_LAYOUT);
      // Back to the exact default → drop the params; the default re-applies
      // and shared URLs stay clean.
      writeColumnLayout(p, isDefault ? EMPTY_COLUMN_LAYOUT : next, ns);
      // An all-empty layout writes no params, which reads back as "use the
      // default" — stamp a marker so an explicitly emptied layout sticks.
      if (isEmpty && !isDefault) p.set(ns + PARAM_COL_HIDDEN, "");
      resolved.setSearch(p.toString());
    },
    [resolved, ns, fallback]
  );

  const onLayoutChange = useCallback(
    (next: ColumnLayoutState) => {
      setPending(next);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        persist(next);
        setPending(null);
      }, LAYOUT_URL_WRITE_DEBOUNCE_MS);
    },
    [persist]
  );

  // Flush a pending layout on unmount so the last drag frame is never lost.
  const latestRef = useRef<{
    pending: ColumnLayoutState | null;
    persist: typeof persist;
  }>({ pending, persist });
  latestRef.current = { pending, persist };
  useEffect(
    () => () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        // Invariant: a live timer implies a pending layout — the timeout
        // clears the timer BEFORE it clears `pending`.
        const { pending: last, persist: write } = latestRef.current;
        write(last!);
      }
    },
    []
  );

  return { layout, onLayoutChange };
}
