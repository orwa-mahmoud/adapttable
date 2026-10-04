import type {
  CellContext,
  ColumnInput,
  ColumnLayoutState,
  ComposedFeature,
  Direction,
  HeaderContext,
  PaginationMode,
  TableErrorState,
  TableLabels,
  TableSource,
  TableViewStateConfig,
  UrlStateAdapter,
} from "@adapttable/vue/adapter";
import type { VNodeChild } from "vue";

/** CSS hooks are applied to the corresponding semantic element. */
export interface DataTableClassNames {
  readonly root?: string;
  readonly toolbar?: string;
  readonly searchWrapper?: string;
  readonly searchInput?: string;
  readonly sortSelect?: string;
  readonly sortDirectionButton?: string;
  readonly scroll?: string;
  readonly table?: string;
  readonly thead?: string;
  readonly tbody?: string;
  readonly tr?: string;
  readonly th?: string;
  readonly td?: string;
  readonly sortButton?: string;
  readonly selectionHeader?: string;
  readonly selectionCell?: string;
  readonly selectionCheckbox?: string;
  readonly columnGroup?: string;
  readonly columnGroupToggle?: string;
  readonly cards?: string;
  readonly card?: string;
  readonly cardFields?: string;
  readonly cardRow?: string;
  readonly cardLabel?: string;
  readonly cardValue?: string;
  readonly footer?: string;
  readonly rowsPerPage?: string;
  readonly pager?: string;
  readonly pagePrev?: string;
  readonly pageNext?: string;
  readonly pageNumber?: string;
  readonly pageEllipsis?: string;
  readonly loading?: string;
  readonly loadMore?: string;
  readonly loadMoreButton?: string;
  readonly empty?: string;
  readonly emptyClear?: string;
  readonly error?: string;
  readonly retry?: string;
  readonly refreshing?: string;
  readonly status?: string;
}

/** Native-kit props. Query state is owned by the supplied source when present. */
export interface DataTableProps<TRow> {
  readonly data?: readonly TRow[];
  readonly source?: TableSource<TRow>;
  readonly columns: readonly ColumnInput<TRow>[];
  readonly rowKey: (row: TRow) => string;
  readonly features?: readonly ComposedFeature<NoInfer<TRow>>[];
  readonly tableLabel?: string;
  readonly labels?: TableLabels;
  readonly dir?: Direction;
  readonly locale?: string;
  readonly searchable?: boolean;
  readonly searchDebounceMs?: number;
  readonly forceMobile?: boolean;
  readonly mobileBreakpoint?: number;
  readonly paginationMode?: PaginationMode;
  readonly defaults?: NonNullable<TableViewStateConfig["defaults"]>;
  readonly urlSync?: boolean;
  readonly urlKey?: string;
  readonly urlAdapter?: UrlStateAdapter;
  readonly getSearchText?: (row: TRow) => string;
  readonly selectable?: boolean;
  readonly selectedIds?: readonly string[];
  readonly defaultSelectedIds?: readonly string[];
  readonly columnLayout?: ColumnLayoutState;
  readonly defaultColumnLayout?: Partial<ColumnLayoutState>;
  readonly onColumnRename?: (key: string, name: string) => void;
  readonly multiSort?: boolean;
  readonly fitColumns?: boolean;
  readonly columnWidths?: Readonly<Record<string, number>>;
  readonly collapsibleColumnGroups?: boolean;
  readonly isLoading?: boolean;
  readonly isFetching?: boolean;
  readonly error?: Error | null;
  readonly refetch?: () => void | Promise<unknown>;
  readonly classNames?: DataTableClassNames;
}

/** Per-column renderers take precedence over cell/header table slots. */
export interface DataTableSlots<TRow> {
  cell?: (context: CellContext<TRow>) => VNodeChild;
  header?: (context: HeaderContext<TRow>) => VNodeChild;
  toolbar?: () => VNodeChild;
  loading?: () => VNodeChild;
  empty?: (state: {
    readonly noResults: boolean;
    readonly clear: () => void;
  }) => VNodeChild;
  error?: (state: TableErrorState) => VNodeChild;
}
