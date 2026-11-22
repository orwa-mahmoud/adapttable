import {
  type BaseDataTableProps,
  type Slot,
  type UrlStateAdapter,
} from "@adapttable/react";
import {
  type TableErrorState,
  type TableSource,
} from "@adapttable/react/adapter";
import type { ReactNode } from "react";

/**
 * Overridable sub-components. Each defaults to a styled Mantine part.
 *
 * @public
 */
export interface DataTableSlots {
  /** Replace the loading skeleton. */
  skeleton?: ReactNode;
  /** Replace the empty-state. */
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
  error?: Exclude<Slot<TableErrorState>, undefined>;
}

/**
 * Per-part class name overrides.
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
 * Props for the Mantine `<DataTable>`.
 *
 * @public
 */
export interface DataTablePropsBase<TRow> extends Omit<
  BaseDataTableProps<TRow>,
  "source"
> {
  /**
   * Full-control tier: a prebuilt source (`useFrontendData` /
   * `useQuerySource`). Omit it and pass `data` for the zero-ceremony tiers.
   */
  source?: TableSource<TRow>;
  /**
   * The rows: the table filters, sorts and pages them. A server table
   * passes a server `source` instead.
   */
  data?: readonly TRow[];
  /** The rows are still loading. */
  loading?: boolean;
  /** Forwarded error to display in the table's error state. */
  error?: Error | null;
  /**
   * Namespace for this table's URL params (`urlKey="left"` → `left.q`,
   * `left.page`, …) so multiple tables can share one URL. Applies to the
   * frontend tier; a prebuilt `source` owns its own state.
   */
  urlKey?: string;
  /**
   * URL-state backend for the frontend tier. Defaults to
   * the browser History API; supply a router adapter (react-router,
   * Next.js) — or `createMemoryAdapter()` in tests — to integrate with an
   * existing navigation stack.
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
  /** Replace sub-components (skeleton, empty-state). */
  slots?: DataTableSlots;
  /** Per-part class name overrides. */
  classNames?: DataTableClassNames;
  /**
   * Animate rows/cards on mount (dependency-free; honors reduced motion).
   * Off by default.
   */
  animate?: boolean;
}

/**
 * Props for the `<DataTable>`.
 *
 * @public
 */
export type DataTableProps<TRow> = DataTablePropsBase<TRow>;

/** Mantine color alias re-export for action colors. */
export type { MantineColor } from "@mantine/core";
