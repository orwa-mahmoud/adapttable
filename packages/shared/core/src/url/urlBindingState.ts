/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */

import type { ColumnLayoutState } from "../columns/columnLayoutModel";
import type { ExtraFilters, SortDirection } from "../contracts/columns";
import type { QueryFilterGroup } from "../contracts/query";
import type { GroupAggregateOverrides } from "../grouping/groupAggregateOverrides";
import type { RowPinState } from "../rows/rowPinModel";
import type { TableStateMutators } from "../tableStateMutators";
import type { SavedView } from "./savedViewsController";
import type { TableDensity } from "./viewStateSlices";

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
 * The controlled pair `<DataTable>` takes.
 *
 * @public
 */
export interface UseGroupCollapseUrlStateResult {
  /** The collapsed group keys. */
  collapsedGroupIds: string[];
  /** Hand this to `onCollapsedGroupIdsChange`. */
  onCollapsedGroupIdsChange: (ids: string[]) => void;
}

/**
 * The controlled pair `<DataTable>` takes.
 *
 * @public
 */
export interface UseRowPinningUrlStateResult {
  /** The pin lists. */
  pinnedRowIds: RowPinState;
  /** Hand this to `onPinnedRowIdsChange`. */
  onPinnedRowIdsChange: (next: RowPinState) => void;
}

/**
 * Result of `useSavedViews`.
 *
 * @public
 */
export interface UseSavedViewsResult {
  /** The saved views, in save order. */
  views: readonly SavedView[];
  /** Capture the table's CURRENT state under a name (replaces same-name). */
  save: (name: string) => void;
  /** Apply a saved view to the table (other tables' params untouched). */
  apply: (name: string) => void;
  /** Remove a saved view. */
  remove: (name: string) => void;
  /**
   * Rename a view, keeping its place in the list. A no-op when the name is
   * unknown or the new name is taken — silently merging two views is how a
   * rename loses one.
   */
  rename: (from: string, to: string) => void;
  /**
   * Move a view one step through the list. Past either end does nothing
   * rather than wrapping, and a view this reader may not change does not move
   * at all. With a `store`, the new order reaches it through
   * {@link SavedViewsStore.reorder}; a store without that member reorders for
   * the session only.
   */
  move: (name: string, delta: -1 | 1) => void;
  /**
   * Make a view the default, or clear the default by passing its own name
   * again. Only one view can hold it.
   */
  setDefault: (name: string) => void;
  /** The default view, when one is set. */
  defaultView: SavedView | undefined;
  /**
   * Read the list again — after someone else has changed a shared view, say.
   * Loading happens on mount and when `storageKey` changes; a `store` or a
   * `migrate` written inline changes identity on every render, so neither can
   * be allowed to trigger it. Refreshing is therefore something the host asks
   * for rather than something identity accidentally causes.
   */
  reload: () => void;
}

/**
 * State + setters returned by `useTableUrlState`.
 *
 * @public
 */
export interface UseTableUrlStateResult extends TableStateMutators {
  /** Current 1-based page. */
  page: number;
  /** Current page size. */
  limit: number;
  /**
   * Page size applied when the URL has no `limit` param (`defaults.limit`,
   * or 25). Stable across `setLimit` so the rows-per-page list can keep it.
   */
  defaultLimit: number;
  /** Current committed search term. */
  search: string;
  /** Active sort column key, if any. */
  sortBy: string | undefined;
  /** Active sort direction, if any. */
  sortDir: SortDirection | undefined;
  /** Active row-grouping keys, comma-separated, if any. */
  groupBy: string | undefined;
  /** Session-level group aggregation choices keyed by column. */
  groupAggregateOverrides: GroupAggregateOverrides;
  /** The extra-filter bag. */
  extra: ExtraFilters;
  /** Nested AND/OR filter tree, when one is in the URL. */
  filterTree: QueryFilterGroup | undefined;
}

/**
 * The controlled pair to spread onto the table.
 *
 * @public
 */
export interface UseDensityUrlStateResult {
  /** Current row density. */
  density: TableDensity;
  /** Switches density. */
  onDensityChange: (next: TableDensity) => void;
}
