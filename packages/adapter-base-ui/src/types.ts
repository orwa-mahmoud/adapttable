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

/** Per-part class hooks — restyle without replacing components. */
export interface DataTableClassNames {
  root?: string;
  toolbar?: string;
  table?: string;
  card?: string;
  footer?: string;
}

/**
 * Accent token forwarded to primary controls. Names mirror common kit accents
 * so existing demos can swap adapters without renaming; they map onto CSS via
 * `data-color` on buttons/badges.
 */
export type BaseUiAccentColor =
  | "gray"
  | "gold"
  | "bronze"
  | "brown"
  | "yellow"
  | "amber"
  | "orange"
  | "tomato"
  | "red"
  | "ruby"
  | "crimson"
  | "pink"
  | "plum"
  | "purple"
  | "violet"
  | "iris"
  | "indigo"
  | "blue"
  | "cyan"
  | "teal"
  | "jade"
  | "green"
  | "grass"
  | "lime"
  | "mint"
  | "sky";

/** Props for the Base UI `<DataTable>`. */
export interface DataTableProps<TRow> extends Omit<
  BaseDataTableProps<TRow>,
  "source"
> {
  /**
   * Full-control tier: a prebuilt source (`useFrontendData`,
   * `useBackendData`, `useServerData`, …). Omit it and pass `data` for the
   * zero-ceremony tiers instead.
   */
  source?: TableSource<TRow>;
  /**
   * The raw rows. Alone → frontend tier (the table filters/sorts/pages
   * them, with declarative filters applied automatically); together with
   * `onQueryChange` → server tier (rows render untouched and the pager
   * reads `total`).
   */
  data?: readonly TRow[];
  /** Server tier: total row count across all pages (drives the pager). */
  total?: number;
  /** Server tier: a request is in flight. */
  loading?: boolean;
  /**
   * Server tier: fired with the consolidated query whenever it changes —
   * including once on mount with the URL-restored values.
   */
  onQueryChange?: NonNullable<UseServerDataOptions<TRow>["onQueryChange"]>;
  /**
   * URL-state backend for the built-in tiers. Defaults to the browser
   * History API; pass a router adapter (or a memory adapter) to integrate.
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
   * Namespace for this table's URL params, so multiple tables can share
   * one URL without colliding.
   */
  urlKey?: string;
  /**
   * Mount the saved-views toolbar menu: capture, re-apply, and delete named
   * snapshots of this table's URL state. The table's own `urlAdapter` /
   * `urlKey` fill in unless the options override them.
   */
  savedViews?: UseSavedViewsOptions;
  /** Replace sub-components (skeleton, empty-state). */
  slots?: DataTableSlots;
  /** Per-part class hooks (root / toolbar / table / card / footer). */
  classNames?: DataTableClassNames;
  /** Accent color for primary controls (buttons, badges, active page). */
  accentColor?: BaseUiAccentColor;
  /** Table size. Defaults by density (compact → `"1"`, else `"2"`). */
  size?: "1" | "2" | "3";
  /**
   * Animate rows/cards on mount (dependency-free; honors reduced motion).
   * Off by default.
   */
  animate?: boolean;
}
