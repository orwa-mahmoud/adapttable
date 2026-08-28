import type {
  BaseDataTableProps,
  Slot,
  TableErrorState,
  UrlStateAdapter,
  UseSavedViewsOptions,
  UseTableDataOptions,
} from "@adapttable/core";
import type { DataModeProps } from "@adapttable/core/adapter";
import type { ReactNode } from "react";

/**
 * Overridable sub-components.
 *
 * @public
 */
export interface DataTableSlots {
  /** Replace the loading state shown while the first page loads. */
  skeleton?: ReactNode;
  /** Replace the empty-state shown when there are no rows. */
  empty?: ReactNode;
  /**
   * Replace the empty-state shown when a search or filter matched nothing.
   *
   * Falls back to `empty` when unset, so passing only `empty` keeps covering
   * both states. Set this when the filtered case needs its own message — the
   * built-in one carries a working "clear all filters" action that a custom
   * `empty` would otherwise replace in both situations.
   */
  noResults?: ReactNode;
  /**
   * Replace the load-failure state.
   *
   * Unlike the other slots this one also takes a function, because an error
   * state is about something: the function receives the error being reported
   * and the retry the source can actually perform, so a replacement can offer
   * both. Pass a plain node when the message is fixed.
   */
  error?: Slot<TableErrorState>;
}

/** Props for the Ant Design `<DataTable>`. */
/**
 * Structural class hooks for the antd adapter. Fine-grained per-part
 * styling belongs to `@adapttable/unstyled` / `@adapttable/shadcn`; here
 * the kit owns the visuals and these hooks target the wrapper elements.
 *
 * @public
 */
export interface DataTableClassNames {
  /** The root wrapper (also reachable via `className`). */
  root?: string;
  /** The toolbar row (search, filters, export, menus). */
  toolbar?: string;
  /** The desktop table region. */
  table?: string;
  /** One mobile card (merged with `rowClassName`). */
  card?: string;
  /** The pagination footer region. */
  footer?: string;
}

interface DataTablePropsBase<TRow>
  extends
    Omit<BaseDataTableProps<TRow>, "source">,
    Pick<
      UseTableDataOptions<TRow>,
      | "source"
      | "data"
      | "total"
      | "loading"
      | "error"
      | "urlKey"
      | "supports"
      | "facetKeys"
      | "facets"
    > {
  /**
   * URL-state backend for the built-in `data` / `onQueryChange` tiers.
   * Defaults to the browser History API; pass a router adapter
   * (react-router / Next.js) to integrate with an existing navigation stack.
   * Ignored when a prebuilt `source` is supplied (the source owns its state).
   */
  urlAdapter?: UrlStateAdapter;
  /**
   * Sync table state (search, sort, page, filters) to the URL. `false`
   * keeps everything in memory — the table works identically, the address
   * bar never changes, and any `urlAdapter` is ignored.
   *
   * @default true
   */
  urlSync?: boolean;
  /**
   * Mount the built-in saved-views menu in the toolbar. Options are forwarded
   * to core's `useSavedViews`; `adapter` and `urlKey` default to the table's
   * own `urlAdapter` / `urlKey` so views capture THIS table's params.
   */
  savedViews?: UseSavedViewsOptions;
  /** Replace sub-components (skeleton, empty-state). */
  slots?: DataTableSlots;
  /** Class name applied to the outer wrapper. */
  className?: string;
  /** Per-part class hooks for the structural elements. */
  classNames?: DataTableClassNames;
  /**
   * antd table size. Overrides the size derived from `density`
   * (`"compact"` → `"small"`, `"comfortable"` → `"middle"`); use it to opt
   * into `"large"`.
   */
  size?: "small" | "middle" | "large";
  /** Render the table with cell borders. Defaults to `false`. */
  bordered?: boolean;
  /**
   * Animate rows/cards on mount (dependency-free; honors reduced motion).
   * Off by default.
   */
  animate?: boolean;
}

/**
 * Props for the antd `<DataTable>`: the base surface intersected with
 * core's data-mode union, so `mode="server"` requires `onQueryChange`
 * at compile time and `mode="frontend"` turns it into a pure
 * notification.
 *
 * @public
 */
export type DataTableProps<TRow> = DataTablePropsBase<TRow> &
  DataModeProps<TRow>;
