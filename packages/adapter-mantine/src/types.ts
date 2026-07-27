import type {
  BaseDataTableProps,
  TableSource,
  UrlStateAdapter,
  UseSavedViewsOptions,
} from "@adapttable/core";
import type { DataModeProps } from "@adapttable/core/adapter";
import type { ReactNode } from "react";

/** Overridable sub-components. Each defaults to a styled Mantine part. */
export interface DataTableSlots {
  /** Replace the loading skeleton. */
  skeleton?: ReactNode;
  /** Replace the empty-state. */
  empty?: ReactNode;
}

/** Per-part class name overrides. */
export interface DataTableClassNames {
  root?: string;
  toolbar?: string;
  table?: string;
  card?: string;
  footer?: string;
}

/** Props for the Mantine `<DataTable>`. */
interface DataTablePropsBase<TRow> extends Omit<
  BaseDataTableProps<TRow>,
  "source"
> {
  /**
   * Full-control tier: a prebuilt source (`useFrontendData` /
   * `useQuerySource`). Omit it and pass `data` for the zero-ceremony tiers.
   */
  source?: TableSource<TRow>;
  /**
   * Frontend tier: the raw rows — the table filters, sorts and pages them.
   * Combined with `onQueryChange` it becomes the server tier: `data` is the
   * current page, rendered as-is.
   */
  data?: readonly TRow[];
  /** Server tier: total row count across all pages (drives the pager). */
  total?: number;
  /** Server tier: a request is in flight. */
  loading?: boolean;
  /** Forwarded error to display in the table's error state. */
  error?: Error | null;
  /**
   * Namespace for this table's URL params (`urlKey="left"` → `left.q`,
   * `left.page`, …) so multiple tables can share one URL. Applies to the
   * `data` / `onQueryChange` tiers; a prebuilt `source` owns its own state.
   */
  urlKey?: string;
  /**
   * URL-state backend for the `data` / `onQueryChange` tiers. Defaults to
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
  /**
   * Saved views: capture the table's current URL state (search, sort, page,
   * filters, column layout) under a name and re-apply it on demand. Setting
   * this renders a Saved-views menu in the toolbar next to the Columns
   * button. `adapter` / `urlKey` default to the table's own `urlAdapter` /
   * `urlKey`, so usually only `storageKey` is needed.
   */
  savedViews?: UseSavedViewsOptions;
  /** Replace sub-components (skeleton, empty-state). */
  slots?: DataTableSlots;
  /** Per-part class name overrides. */
  classNames?: DataTableClassNames;
  /**
   * Keep the toolbar sticky while the page scrolls, parked at `stickyTop`.
   * The sticky HEADER then offsets below it automatically. Off by default —
   * `stickyTop` alone means the same thing here as in every other adapter:
   * the sticky-header inset.
   */
  stickyToolbar?: boolean;
  /**
   * Animate rows/cards on mount (dependency-free; honors reduced motion).
   * Off by default.
   */
  animate?: boolean;
}

/**
 * Props for the Mantine `<DataTable>`: the base surface intersected
 * with core's data-mode union, so `mode="server"` requires
 * `onQueryChange` at compile time and `mode="frontend"` turns it into a
 * pure notification.
 */
export type DataTableProps<TRow> = DataTablePropsBase<TRow> &
  DataModeProps<TRow>;

/** Mantine color alias re-export for action colors. */
export type { MantineColor } from "@mantine/core";
