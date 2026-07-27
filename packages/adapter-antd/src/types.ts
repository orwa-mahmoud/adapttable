import type {
  BaseDataTableProps,
  DataModeProps,
  UrlStateAdapter,
  UseSavedViewsOptions,
  UseTableDataOptions,
} from "@adapttable/core";
import type { ReactNode } from "react";

/** Overridable sub-components. */
export interface DataTableSlots {
  /** Replace the loading state shown while the first page loads. */
  skeleton?: ReactNode;
  /** Replace the empty-state shown when there are no rows. */
  empty?: ReactNode;
}

/** Props for the Ant Design `<DataTable>`. */
interface DataTablePropsBase<TRow>
  extends
    Omit<BaseDataTableProps<TRow>, "source">,
    Pick<
      UseTableDataOptions<TRow>,
      "source" | "data" | "total" | "loading" | "urlKey"
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
  /**
   * antd table size. Overrides the size derived from `density`
   * (`"compact"` → `"small"`, `"comfortable"` → `"middle"`); use it to opt
   * into `"large"`.
   */
  size?: "small" | "middle" | "large";
  /** Render the table with cell borders. Defaults to `false`. */
  bordered?: boolean;
  /** Vertical scroll height used when `virtualize` is true. Defaults to 480. */
  virtualHeight?: number;
  /** Horizontal scroll width used when `virtualize` is true. Defaults to 960. */
  virtualWidth?: number;
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
 */
export type DataTableProps<TRow> = DataTablePropsBase<TRow> &
  DataModeProps<TRow>;
