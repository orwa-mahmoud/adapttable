import type {
  BaseDataTableProps,
  TableSource,
  UrlStateAdapter,
  UseSavedViewsOptions,
  UseServerDataOptions,
} from "@adapttable/core";
import type { ReactNode } from "react";

/** Overridable sub-components. */
export interface DataTableSlots {
  /** Replace the loading skeleton. */
  skeleton?: ReactNode;
  /** Replace the empty-state. */
  empty?: ReactNode;
}

/** Props for the Material UI `<DataTable>`. */
export interface DataTableProps<TRow> extends Omit<
  BaseDataTableProps<TRow>,
  "source"
> {
  /**
   * Full-control data tier: a prebuilt source (`useFrontendData` /
   * `useBackendData`). Omit it and pass `data` instead for the zero-ceremony
   * tiers below.
   */
  source?: TableSource<TRow>;
  /**
   * Frontend tier: the raw rows — the table filters/sorts/pages them.
   * With `onQueryChange` it becomes the server tier: the current page of
   * rows, exactly as the server returned them.
   */
  data?: readonly TRow[];
  /** Server tier: total row count across all pages (drives the pager). */
  total?: number;
  /** Server tier: request in flight. */
  loading?: boolean;
  /**
   * Server tier: fired with the consolidated query (page, search, sort,
   * filters) whenever it changes — including once on mount with the
   * URL-restored values. Run the request and hand back `data` + `total`.
   */
  onQueryChange?: NonNullable<UseServerDataOptions<TRow>["onQueryChange"]>;
  /**
   * URL-state backend for the built-in tiers. Defaults to the browser
   * History API; supply a router adapter (react-router / Next.js) — or a
   * memory adapter in tests — to integrate with an existing stack.
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
   * Namespace for this table's URL params (`left.q`, `left.f_status`, …) so
   * multiple tables can share one URL without colliding.
   */
  urlKey?: string;
  /**
   * Mount a saved-views menu in the toolbar: name and capture the table's
   * current URL state (search, sort, page, filters, column layout), then
   * re-apply it on demand. `adapter`/`urlKey` default to the table's own
   * `urlAdapter`/`urlKey`, so usually only `storageKey` is needed.
   */
  savedViews?: UseSavedViewsOptions;
  /** Replace sub-components (skeleton, empty-state). */
  slots?: DataTableSlots;
  /** Class name applied to the root `<Paper>`. */
  className?: string;
  /**
   * Explicit MUI table size override. When omitted, the size is derived from
   * `density`: `"comfortable"` → `"medium"`, `"compact"` → `"small"`.
   */
  size?: "small" | "medium";
  /**
   * Animate rows/cards on mount (dependency-free; honors reduced motion).
   * Off by default.
   */
  animate?: boolean;
}
