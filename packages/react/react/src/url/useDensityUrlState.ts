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
import { densitySlice, type TableDensity } from "@adapttable/core";

import type { UrlStateAdapter } from "./adapter";
import { useUrlSlice } from "./useUrlSlice";

/**
 * The two layouts a table has.
 *
 * @public
 */
export type Density = TableDensity;

export { URL_SLICE_WRITE_DEBOUNCE_MS as DENSITY_URL_WRITE_DEBOUNCE_MS } from "@adapttable/core";

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
  const [density, onDensityChange] = useUrlSlice(options, densitySlice, {
    defaultDensity: options.defaultDensity,
  });
  return { density, onDensityChange };
}
