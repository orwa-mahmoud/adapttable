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
  type PivotConfig,
  pivotSlice,
  URL_SLICE_WRITE_DEBOUNCE_MS,
} from "@adapttable/core";
import { useCallback, useMemo } from "react";

import type { UrlStateAdapter } from "../url/adapter";
import { useUrlSlice } from "../url/useUrlSlice";

export type { UrlStateAdapter };

/**
 * Trailing debounce for URL persistence, as the column-layout and formula hooks
 * use. Reads stay instant through the optimistic overlay below; the write waits,
 * which is what lets the overlay bridge a router whose navigation lands a tick
 * later — clearing it in the same batch as the write leaves one render with the
 * overlay gone and the URL not yet updated, so a field the reader just moved
 * jumps back to where it was.
 */
export const PIVOT_URL_WRITE_DEBOUNCE_MS = URL_SLICE_WRITE_DEBOUNCE_MS;

/**
 * What {@link usePivotUrlState} needs.
 *
 * @public
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
 * @public
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
 * @public
 */
export function usePivotUrlState(
  options: UsePivotUrlStateOptions = {}
): UsePivotUrlStateResult {
  const [state, change, latest] = useUrlSlice(options, pivotSlice, {
    defaultConfig: options.defaultConfig,
  });
  const collapsed = useMemo(() => new Set(state.collapsed), [state.collapsed]);

  // The setters read the latest state, a change not yet written included. Two
  // of them share one parameter, and a render is not guaranteed between them:
  // a handler that changes the configuration and the folded set in one batch
  // would otherwise write the second change over the first.
  const onConfigChange = useCallback(
    (next: PivotConfig) => {
      // The folded keys ride along: a field moved on an axis does not unfold
      // what the reader had folded, and a key whose group is gone simply
      // matches nothing.
      change({ config: next, collapsed: latest().collapsed });
    },
    [change, latest]
  );

  const onCollapsedChange = useCallback(
    (next: ReadonlySet<string>) => {
      change({ config: latest().config, collapsed: [...next] });
    },
    [change, latest]
  );

  return { config: state.config, onConfigChange, collapsed, onCollapsedChange };
}
