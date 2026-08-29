import type {
  BaseDataTableProps,
  TableSource,
  UrlStateAdapter,
  UseSavedViewsOptions,
} from "@adapttable/core";
import type { DataModeProps } from "@adapttable/core/adapter";
import type { ReactNode } from "react";

/**
 * Overridable sub-components.
 *
 * @public
 */
export interface DataTableSlots {
  /** Replace the loading skeleton. */
  skeleton?: ReactNode;
  /** Replace the empty-state. */
  empty?: ReactNode;
  /** Replace the empty-state shown when a search or filter matched nothing. */
  noResults?: ReactNode;
}

/**
 * Per-part class hooks — restyle without replacing components.
 *
 * @public
 */
export interface DataTableClassNames {
  /** Class for the outermost wrapper. */
  root?: string;
  /** Class for the toolbar above the table. */
  toolbar?: string;
  /** Class for the table element. */
  table?: string;
  /** Class for a mobile card. */
  card?: string;
  /** Class for the pagination footer. */
  footer?: string;
}

/**
 * Props for the React Bootstrap `<DataTable>`.
 *
 * @public
 */
export interface DataTablePropsBase<TRow> extends Omit<
  BaseDataTableProps<TRow>,
  "source"
> {
  /**
   * Full-control tier: a prebuilt source.
   */
  source?: TableSource<TRow>;

  /**
   * Raw rows for the built-in frontend/server tiers.
   */
  data?: readonly TRow[];

  /** Server tier: total row count across all pages. */
  total?: number;

  /** Server tier: request is in flight. */
  loading?: boolean;

  /** URL-state backend for the built-in tiers. */
  urlAdapter?: UrlStateAdapter;

  /**
   * Sync table state to the URL.
   * @default true
   */
  urlSync?: boolean;

  /** Namespace for this table's URL parameters. */
  urlKey?: string;

  /** Saved-view configuration. */
  savedViews?: UseSavedViewsOptions;

  /** Replace sub-components. */
  slots?: DataTableSlots;

  /** Per-part class hooks. */
  classNames?: DataTableClassNames;

  /** Bootstrap accent/color configuration. */
  accentColor?: string;

  /** Bootstrap table size. */
  size?: "sm" | "md" | "lg";

  /** Animate rows/cards on mount. */
  animate?: boolean;
}

/**
 * Props for the React Bootstrap `<DataTable>`.
 *
 * The base surface is intersected with core's data-mode union so the
 * appropriate data-mode requirements are enforced at compile time.
 *
 * @public
 */
export type DataTableProps<TRow> = DataTablePropsBase<TRow> &
  DataModeProps<TRow>;
