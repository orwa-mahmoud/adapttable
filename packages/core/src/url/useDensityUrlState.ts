/**
 * Density in the URL, so a chosen layout survives a reload and a shared
 * link.
 *
 * Density is a display preference, and display preferences that live only
 * in memory are the ones people re-set every morning. It sits in the URL
 * with sort, filters and column layout for the same reason those do: the
 * table's visible state should be reproducible by sending someone a link.
 *
 * The host stays in control. Pass `density` and this hook is inert — a
 * controlled table's density is the host's business, and a URL that
 * silently overrode it would be a second source of truth.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";
import { PARAM_DENSITY } from "./serialize";

/**
 * The two layouts a table has.
 *
 * @public
 */
export type Density = "comfortable" | "compact";

/**
 * Trailing debounce for URL persistence, as the column-layout and formula hooks
 * use. Reads stay instant through the optimistic overlay below; the write waits,
 * which is what lets the overlay bridge a router whose navigation lands a tick
 * later — clearing it in the same batch as the write leaves one render with the
 * overlay gone and the URL not yet updated, so the table flicks back to the
 * density the reader just left.
 */
export const DENSITY_URL_WRITE_DEBOUNCE_MS = 150;

/**
 * What {@link useDensityUrlState} needs.
 *
 * @public
 */
export interface UseDensityUrlStateOptions {
  /** Reads and writes the URL. */
  urlAdapter?: UrlStateAdapter;
  /** Whether the state is mirrored into the URL. */
  urlSync?: boolean;
  /** Query-parameter name to use. */
  urlKey?: string;
  /** The density before anyone has chosen one. Defaults to comfortable. */
  defaultDensity?: Density;
}

/**
 * The controlled pair to spread onto the table.
 *
 * @public
 */
export interface UseDensityUrlStateResult {
  /** Current row density. */
  density: Density;
  /** Switches density. */
  onDensityChange: (next: Density) => void;
}

function readDensity(params: URLSearchParams, ns: string): Density | undefined {
  const raw = params.get(`${ns}${PARAM_DENSITY}`);
  return raw === "compact" || raw === "comfortable" ? raw : undefined;
}

/**
 * Keep the table's density in the URL.
 *
 * @param options - See {@link UseDensityUrlStateOptions}.
 * @returns The controlled pair to spread onto the table.
 *
 * @public
 */
export function useDensityUrlState(
  options: UseDensityUrlStateOptions = {}
): UseDensityUrlStateResult {
  const { urlAdapter, urlSync, urlKey, defaultDensity } = options;
  const ns = urlKey ? `${urlKey}.` : "";
  const resolved = useResolvedAdapter(urlAdapter, urlSync ?? true);
  // Same SSR rule as the other URL hooks: only an explicit adapter is
  // trusted to be hydration-consistent.
  const search = useSyncExternalStore(
    (onChange) => resolved.subscribe(onChange),
    () => resolved.getSearch(),
    () => (urlAdapter ? urlAdapter.getSearch() : "")
  );
  // Optimistic overlay: the click that has not reached the URL yet.
  const [pending, setPending] = useState<Density | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const density = useMemo(() => {
    if (pending) return pending;
    return (
      readDensity(new URLSearchParams(search), ns) ??
      defaultDensity ??
      "comfortable"
    );
  }, [pending, search, ns, defaultDensity]);

  const persist = useCallback(
    (next: Density) => {
      const params = new URLSearchParams(resolved.getSearch());
      // The default writes no parameter: a URL should carry what someone
      // chose, not restate what the table would have done anyway.
      if (next === (defaultDensity ?? "comfortable")) {
        params.delete(`${ns}${PARAM_DENSITY}`);
      } else {
        params.set(`${ns}${PARAM_DENSITY}`, next);
      }
      resolved.setSearch(params.toString());
    },
    [resolved, ns, defaultDensity]
  );

  const onDensityChange = useCallback(
    (next: Density) => {
      setPending(next);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        persist(next);
        setPending(null);
      }, DENSITY_URL_WRITE_DEBOUNCE_MS);
    },
    [persist]
  );

  // Flush a pending choice on unmount, so a density chosen and navigated away
  // from is not lost.
  const latestRef = useRef<{
    pending: Density | null;
    persist: typeof persist;
  }>({ pending, persist });
  latestRef.current = { pending, persist };
  useEffect(
    () => () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        // Invariant: a live timer implies a pending choice — the timeout clears
        // the timer BEFORE it clears `pending`.
        const { pending: last, persist: write } = latestRef.current;
        write(last!);
      }
    },
    []
  );

  return { density, onDensityChange };
}
