/**
 * The pivot state in the URL, so a built pivot survives a reload and can be
 * sent to someone.
 *
 * A pivot is the most expensive table state there is to rebuild by hand —
 * two axes, an order on each, and a measure list — which makes it the state
 * most worth putting in a link. It sits alongside sort, filters and column
 * layout for exactly the reason those do.
 *
 * Everything a reader changed travels, not only the axes: the subtotal and
 * grand-total switches, and which groups are folded. What someone sends is what
 * they were looking at, or the link is of a different table.
 *
 * The encoding itself is in {@link ./pivotUrlCodec}, which this hook reads
 * and writes through: a browser is only one end of a shared link, and the
 * other end is a server that never renders.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { type UrlStateAdapter, useResolvedAdapter } from "../url/adapter";
import { PARAM_PIVOT } from "../url/serialize";
import { EMPTY_PIVOT_CONFIG } from "./pivotConfigModel";
import type { PivotConfig } from "./pivotModel";
import {
  deserializePivotState,
  type PivotUrlState,
  serializePivotState,
} from "./pivotUrlCodec";

/**
 * Trailing debounce for URL persistence, as the column-layout and formula hooks
 * use. Reads stay instant through the optimistic overlay below; the write waits,
 * which is what lets the overlay bridge a router whose navigation lands a tick
 * later — clearing it in the same batch as the write leaves one render with the
 * overlay gone and the URL not yet updated, so a field the reader just moved
 * jumps back to where it was.
 */
export const PIVOT_URL_WRITE_DEBOUNCE_MS = 150;

/** Nothing folded, with a stable identity so a read cannot churn a memo. */
const NOTHING_COLLAPSED: readonly string[] = [];

/**
 * What {@link usePivotUrlState} needs.
 *
 * @internal
 */
export interface UsePivotUrlStateOptions {
  /** Reads and writes the URL. */
  urlAdapter?: UrlStateAdapter;
  /** Whether the state is mirrored into the URL. */
  urlSync?: boolean;
  /** Query-parameter name to use. */
  urlKey?: string;
  /** The pivot before anyone has built one. Defaults to empty. */
  defaultConfig?: PivotConfig;
}

/**
 * The controlled state to hand the panel and the engine.
 *
 * @internal
 */
export interface UsePivotUrlStateResult {
  /** What to pivot, and how. Give it to the panel and to `pivot`. */
  config: PivotConfig;
  /** Persist a new configuration. Wire to the panel's `onChange`. */
  onConfigChange: (next: PivotConfig) => void;
  /**
   * The folded subtotal lines, by key — `pivot`'s `collapsed` option, so the
   * link and the rendering agree without the host holding a second copy.
   */
  collapsed: ReadonlySet<string>;
  /** Persist a new folded set. Wire to whatever folds a subtotal line. */
  onCollapsedChange: (next: ReadonlySet<string>) => void;
}

/**
 * Keep the pivot state in the URL.
 *
 * @param options - See {@link UsePivotUrlStateOptions}.
 * @returns The configuration, the folded set, and the setters for both.
 *
 * @internal
 */
export function usePivotUrlState(
  options: UsePivotUrlStateOptions = {}
): UsePivotUrlStateResult {
  const { urlAdapter, urlSync, urlKey, defaultConfig } = options;
  const ns = urlKey ? `${urlKey}.` : "";
  const param = `${ns}${PARAM_PIVOT}`;
  const resolved = useResolvedAdapter(urlAdapter, urlSync ?? true);
  // Same SSR rule as the other URL hooks: only an explicit adapter is
  // trusted to be hydration-consistent.
  const search = useSyncExternalStore(
    (onChange) => resolved.subscribe(onChange),
    () => resolved.getSearch(),
    () => (urlAdapter ? urlAdapter.getSearch() : "")
  );
  // Optimistic overlay: the change that has not reached the URL yet.
  const [pending, setPending] = useState<PivotUrlState | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = useMemo<PivotUrlState>(() => {
    if (pending) return pending;
    const raw = new URLSearchParams(search).get(param);
    if (raw === null) {
      return {
        config: defaultConfig ?? EMPTY_PIVOT_CONFIG,
        collapsed: NOTHING_COLLAPSED,
      };
    }
    return deserializePivotState(raw);
  }, [pending, search, param, defaultConfig]);

  const collapsed = useMemo(() => new Set(state.collapsed), [state.collapsed]);

  const persist = useCallback(
    (next: PivotUrlState) => {
      const params = new URLSearchParams(resolved.getSearch());
      const value = serializePivotState(next);
      // An empty pivot writes no parameter: a URL should carry what someone
      // built, not restate the nothing the table starts with.
      if (value === "") params.delete(param);
      else params.set(param, value);
      resolved.setSearch(params.toString());
    },
    [resolved, param]
  );

  // What the setters below read. Two of them share one parameter, and a render
  // is not guaranteed between them: a handler that changes the configuration and
  // the folded set in one batch would otherwise write the second change over the
  // first, because both would have read the state this render was built from.
  const latest = useRef<PivotUrlState>(state);
  latest.current = state;

  const change = useCallback(
    (next: PivotUrlState) => {
      latest.current = next;
      setPending(next);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        persist(next);
        setPending(null);
      }, PIVOT_URL_WRITE_DEBOUNCE_MS);
    },
    [persist]
  );

  const onConfigChange = useCallback(
    (next: PivotConfig) => {
      // The folded keys ride along: a field moved on an axis does not unfold
      // what the reader had folded, and a key whose group is gone simply
      // matches nothing.
      change({ config: next, collapsed: latest.current.collapsed });
    },
    [change]
  );

  const onCollapsedChange = useCallback(
    (next: ReadonlySet<string>) => {
      change({ config: latest.current.config, collapsed: [...next] });
    },
    [change]
  );

  // Flush a pending change on unmount, so the last move a reader made before
  // navigating is not lost.
  const latestRef = useRef<{
    pending: PivotUrlState | null;
    persist: typeof persist;
  }>({ pending, persist });
  latestRef.current = { pending, persist };
  useEffect(
    () => () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        // Invariant: a live timer implies a pending change — the timeout
        // clears the timer BEFORE it clears `pending`.
        const { pending: last, persist: write } = latestRef.current;
        write(last!);
      }
    },
    []
  );

  return { config: state.config, onConfigChange, collapsed, onCollapsedChange };
}
