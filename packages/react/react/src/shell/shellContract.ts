import {
  type Direction,
  type FeatureHostState,
  type FilterDef,
  type FilterRuntime,
  type FilterTypeRegistry,
  type GroupingPanelState,
  type SelectionStats,
  type SortByOption,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import type { TableStore } from "@adapttable/core/binding";
import { type ReactNode, type RefCallback, type RefObject } from "react";

import type { TableChrome } from "../chrome/tableChromeContract";
import type { FilterTriggerToggle } from "../chrome/toolbarChrome";
import type { ColumnDef } from "../columnDef";
import type { EditHistoryState } from "../editing/editHistory";
import type { ChipLabelResolver } from "../filters/useActiveFilterChips";
import type { FindInTableState } from "../find/useFindInTable";
import type { GridFocusState } from "../focus/useGridFocus";
import type { FullscreenState } from "../layout/useFullscreen";
import type { ComposedTableProps, ToolbarSlots } from "../props";
import type { SharedTableRenderProps } from "../tableRenderProps";
import { type UrlStateAdapter } from "../url/adapter";
import type { Density } from "../url/useDensityUrlState";
import type { UseDataTableResult } from "../useDataTable/useDataTable";
import type { ColumnWindow } from "../virtual/useColumnWindow";

/**
 * The kit-agnostic prop surface every batteries-included `<DataTable>` shares:
 * the base display props plus the three data tiers (`source` / `data` +
 * `onQueryChange`) and the URL-sync controls. Adapters extend this with
 * kit-specific extras (slots, classNames, colour, table size) and pass the
 * whole thing straight through to `useDataTableShell`.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export type DataTableShellProps<TRow> = Omit<
  ComposedTableProps<TRow>,
  "source"
> & {
  /** A prebuilt source: a server source, a query-library source, … */
  source?: TableSource<TRow>;
  /** Frontend tier: every row. */
  data?: readonly TRow[];
  /** Frontend tier: the rows are still loading. */
  loading?: boolean;
  /** Forwarded error to display in the table's error state. */
  error?: Error | null;
  /** URL-state backend (defaults to the History API). */
  urlAdapter?: UrlStateAdapter;
  /** Sync table state to the URL (default `true`). */
  urlSync?: boolean;
  /** Namespace for this table's URL params. */
  urlKey?: string;
};
/**
 * Chrome props the shell passes into {@link TableChrome}. Named so the
 * adapter declaration does not re-infer this bag from object spread order.
 *
 * @public
 */
export type DataTableShellChromeProps<TRow> = DataTableShellProps<TRow> & {
  /** Resolved density every adapter renders. */
  density: Density;
  /** Request a density change. */
  onDensityChange: (next: Density) => void;
  /** The table's resolved URL backend. */
  urlAdapter: UrlStateAdapter;
  /** The resolved data source. */
  source: TableSource<TRow>;
  /** Filter form node, declarative or host-supplied. */
  filters: ReactNode;
  /** Declarative filter definitions. */
  filterDefs: readonly FilterDef<TRow>[];
  /** Type registry those defs were built against. */
  filterRegistry: FilterTypeRegistry;
  /** Chip label resolvers keyed by filter id. */
  filterLabels: Record<string, ChipLabelResolver>;
};

/**
 * Kit-agnostic table/card render bundle the shell builds. Extends the shared
 * render contract with the two fields only the shell fills.
 *
 * @public
 */
export interface DataTableShellTableProps<
  TRow,
> extends SharedTableRenderProps<TRow> {
  /** Whether the injected actions column is end-pinned. */
  actionsPinned: boolean;
  /** Text direction, when the host set one. */
  dir?: Direction;
  /** Horizontal window the lean table always publishes, even when inert. */
  columnWindow: ColumnWindow<TRow>;
  /** Scroll-box callback the shell always installs. */
  virtualScrollRef: RefCallback<HTMLElement>;
}

/**
 * Kit-agnostic toolbar bundle the shell builds before an adapter adds its
 * filter-trigger and kit extras.
 *
 * @public
 */
export interface DataTableShellToolbarProps<TRow> {
  /** Headless table state and prop-getters. */
  table: UseDataTableResult<TRow>;
  /** Whether the search input renders. */
  searchable: boolean;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Options for an explicit sort-by control. */
  sortByOptions?: SortByOption[];
  /** Extra caller-supplied toolbar content. */
  toolbar?: ReactNode;
  /** Caller-supplied content for the toolbar ends. */
  toolbarSlots?: ToolbarSlots;
  /** Whether a filters affordance should render. */
  hasFilters: boolean;
  /** Number shown on the filters badge. */
  activeFilterCount: number;
  /** Filter form node. */
  filters: ReactNode;
  /** Clear every active filter. */
  onClearFilters: () => void;
  /** Whether to show the rows-per-page control. */
  showRowsPerPage: boolean;
  /** Add-row handler when the host wired one. */
  onAddRow?: () => void;
  /** Add-row control caption. */
  addRowLabel: string;
  /** Text direction. */
  dir?: Direction;
}

/**
 * Grouping-strip props the shell exposes when the grouping-panel feature is
 * composed.
 *
 * @public
 */
export interface DataTableShellGroupingPanelProps<TRow> {
  /** Live grouping-panel state. */
  state: GroupingPanelState;
  /** Columns the strip can group by. */
  columns: ColumnDef<TRow>[];
  /** Resolved labels. */
  labels: Required<TableLabels>;
  /** Whether the table is in the mobile layout. */
  mobile: boolean;
  /** Text direction. */
  dir: Direction | undefined;
}

/**
 * What {@link useDataTableShell} returns, before or after the body gate.
 * Declared as an explicit contract so API Extractor does not emit a
 * `ReturnType` whose member order follows bundler traversal.
 *
 * @public
 */
export interface DataTableShellResult<TRow> {
  /** The table's one store, which its feature components share. */
  tableStore: TableStore;
  /** Cell-navigation state; inert unless `cellNavigation` is set. */
  gridFocus: GridFocusState;
  /** What to announce when the rows change. */
  statusAnnouncement: string;
  /** What the selection adds up to; `null` unless `selectionStats` is set. */
  selectionStats: SelectionStats | null;
  /** Undo/redo controls; inert unless `editHistory` is set. */
  editHistory: EditHistoryState<TRow>;
  /** Find-bar state; inert unless `findInTable` is set. */
  find: FindInTableState;
  /** The chrome's view facade over the resolved source. */
  source: TableSource<TRow>;
  /** Declarative-filter runtime. */
  runtime: FilterRuntime<TRow>;
  /** The table's resolved URL backend. */
  urlAdapter: UrlStateAdapter;
  /** Shared adapter chrome. */
  chrome: TableChrome<TRow>;
  /** Grouping-strip props when that feature is composed. */
  groupingPanelProps: DataTableShellGroupingPanelProps<TRow> | undefined;
  /** Props the chrome was built with. */
  chromeProps: DataTableShellChromeProps<TRow>;
  /** When true, the view leaves `tableProps` alone. */
  skipChromeBody: boolean;
  /** The overflow box both windows attach to. */
  scrollBoxElement: RefObject<HTMLElement | null>;
  /** Headless table state and prop-getters. */
  table: UseDataTableResult<TRow>;
  /** Resolved labels. */
  labels: Required<TableLabels>;
  /** Density every adapter renders. */
  density: Density;
  /** Filter form node. */
  filtersNode: ReactNode;
  /** Whether the filter container is open. */
  filtersOpen: boolean;
  /** Open or close the filter container. */
  setFiltersOpen: (open: boolean) => void;
  /** Filter-trigger pointer/click pairing. */
  filtersTrigger: FilterTriggerToggle;
  /** Table root measured for progressive column hiding. */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Fullscreen state and portal container. */
  fullscreen: FullscreenState;
  /** Size every rendered column to its content. */
  autoSizeColumns: () => void;
  /** Size one named column to its content. */
  autoSizeColumn: (key: string) => void;
  /** Infinite-scroll sentinel; the body gate overlays the real one. */
  loadMoreRef: RefObject<HTMLDivElement | null>;
  /** Whether more rows can be fetched. */
  canLoadMore: boolean;
  /** Whether an actions column exists, hidden or not. */
  hasRowActions: boolean;
  /** Whether a reorder column exists, hidden or not. */
  hasRowReorder: boolean;
  /** Kit-agnostic table/card render bundle. */
  tableProps: DataTableShellTableProps<TRow>;
  /** Kit-agnostic toolbar bundle. */
  toolbarProps: DataTableShellToolbarProps<TRow>;
  /** Feature host this table owns. */
  featureHost: FeatureHostState | undefined;
}
