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
 * grand-total switches, and which groups are folded. What someone sends is
 * what they were looking at, or the link is of a different table.
 */
import {
  injectUrlSlice,
  type MaybeSignalOptional,
  readMaybe,
  type UrlSliceOptions,
} from "@adapttable/angular";
import {
  type PivotConfig,
  pivotSlice,
  type PivotUrlState,
} from "@adapttable/core";
import { computed, type Signal } from "@angular/core";

export type { PivotUrlState } from "@adapttable/core";
export { URL_SLICE_WRITE_DEBOUNCE_MS as PIVOT_URL_WRITE_DEBOUNCE_MS } from "@adapttable/core";

/**
 * What {@link injectPivotUrlState} needs.
 *
 * @public
 */
export interface PivotUrlStateOptions extends UrlSliceOptions {
  /** The pivot applied while the URL carries none. Defaults to empty. */
  readonly defaultConfig?: MaybeSignalOptional<PivotConfig>;
}

/**
 * A pivot kept in the URL: the configuration, the folded lines, and the
 * setters for both.
 *
 * @public
 */
export interface PivotUrlBinding {
  /** What to pivot, and how. Give it to the panel and to `pivot`. */
  readonly config: Signal<PivotConfig>;
  /** Persist a new configuration. Wire to the panel's `onChange`. */
  readonly onConfigChange: (next: PivotConfig) => void;
  /**
   * The folded subtotal lines, by key — `pivot`'s `collapsed` option, so the
   * link and the rendering agree without the host holding a second copy.
   */
  readonly collapsed: Signal<ReadonlySet<string>>;
  /** Persist a new folded set. Wire to whatever folds a subtotal line. */
  readonly onCollapsedChange: (next: ReadonlySet<string>) => void;
}

/**
 * Keep the pivot state in the URL.
 *
 * The setters read the latest state, a change not yet written included. Two
 * of them share one parameter, and a turn is not guaranteed between them: a
 * handler that changes the configuration and the folded set together would
 * otherwise write the second change over the first.
 *
 * @param options - See {@link PivotUrlStateOptions}.
 * @returns See {@link PivotUrlBinding}.
 *
 * @public
 */
export function injectPivotUrlState(
  options: PivotUrlStateOptions = {}
): PivotUrlBinding {
  const slice = injectUrlSlice(
    options,
    pivotSlice,
    computed(() => ({
      defaultConfig: readMaybe(options.defaultConfig),
    }))
  );
  const current = slice.value;
  return {
    config: computed(() => current().config),
    collapsed: computed(() => new Set(current().collapsed)),
    onConfigChange: (next) => {
      // The folded keys ride along: a field moved on an axis does not unfold
      // what the reader had folded, and a key whose group is gone simply
      // matches nothing.
      const latest: PivotUrlState = slice.latest();
      slice.set({ config: next, collapsed: latest.collapsed });
    },
    onCollapsedChange: (next) => {
      const latest: PivotUrlState = slice.latest();
      slice.set({ config: latest.config, collapsed: [...next] });
    },
  };
}
