import {
  columnLayoutSlice,
  URL_SLICE_WRITE_DEBOUNCE_MS,
} from "@adapttable/core";

import type { ColumnLayoutState } from "../columns/useColumnLayout";
import type { UrlStateAdapter } from "./adapter";
import { useUrlSlice } from "./useUrlSlice";

/**
 * Options for {@link useColumnLayoutUrlState}.
 *
 * @public
 */
export interface UseColumnLayoutUrlStateOptions {
  /** URL-state backend. Defaults to the browser History API. */
  urlAdapter?: UrlStateAdapter;
  /** When `false`, keep the layout in a local memory store. Defaults `true`. */
  urlSync?: boolean;
  /** Layout applied when the URL carries no column layout yet. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
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
export const LAYOUT_URL_WRITE_DEBOUNCE_MS = URL_SLICE_WRITE_DEBOUNCE_MS;

/**
 * State + change handler returned by {@link useColumnLayoutUrlState}.
 *
 * @public
 */
export interface UseColumnLayoutUrlStateResult {
  /** Current layout — from the URL, or the default when the URL is empty. */
  layout: ColumnLayoutState;
  /** Persist a new layout into the URL. Wire to `onColumnLayoutChange`. */
  onLayoutChange: (next: ColumnLayoutState) => void;
}

/**
 * Headless URL-synced column layout. Mirrors `useTableUrlState` for the
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
 *
 * @public
 */
export function useColumnLayoutUrlState(
  options: UseColumnLayoutUrlStateOptions = {}
): UseColumnLayoutUrlStateResult {
  const [layout, onLayoutChange] = useUrlSlice(options, columnLayoutSlice, {
    defaultColumnLayout: options.defaultColumnLayout,
  });
  return { layout, onLayoutChange };
}
