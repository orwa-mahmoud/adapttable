import type {
  CellContext,
  ColumnInput,
  ColumnLayoutState,
  ComposedFeature,
  ConfirmHandler,
  Direction,
  HeaderContext,
  PaginationMode,
  TableDensity,
  TableErrorState,
  TableLabels,
  TableSource,
  TableViewStateConfig,
  UrlStateAdapter,
} from "@adapttable/vue/adapter";
import type { TableAssistantProps } from "@adapttable/vue/assistant";
import type { VNodeChild } from "vue";

/** CSS hooks are applied to the corresponding semantic element. */
export interface DataTableClassNames {
  readonly agentApproval?: string;
  readonly agentApprovalButton?: string;
  readonly resizeHandle?: string;
  readonly filterHeaderInput?: string;
  readonly actionsHeader?: string;
  readonly actionsCell?: string;
  readonly cardActions?: string;
  readonly rowAction?: string;
  readonly addRow?: string;
  readonly groupRow?: string;
  readonly groupLabel?: string;
  readonly groupToggle?: string;
  readonly groupCount?: string;
  readonly groupAggregate?: string;
  readonly groupMore?: string;
  readonly groupCheckbox?: string;
  readonly treeCell?: string;
  readonly treeToggle?: string;
  readonly treeSpacer?: string;
  readonly expandToggle?: string;
  readonly detailRow?: string;
  readonly detailCell?: string;
  readonly densitySelect?: string;
  readonly fullscreenButton?: string;
  readonly viewsMenu?: string;
  readonly viewsButton?: string;
  readonly viewsPanel?: string;
  readonly viewsRow?: string;
  readonly viewsItem?: string;
  readonly viewsDelete?: string;
  readonly viewsDivider?: string;
  readonly viewsSaveRow?: string;
  readonly viewsInput?: string;
  readonly viewsSave?: string;
  readonly filtersButton?: string;
  readonly filtersClear?: string;
  readonly filtersDone?: string;
  readonly filtersForm?: string;
  readonly filtersPanel?: string;
  readonly filtersActions?: string;
  readonly filtersToolbar?: string;
  readonly filtersPopover?: string;
  readonly filtersDrawer?: string;
  readonly filterField?: string;
  readonly filterLabel?: string;
  readonly filterControl?: string;
  readonly filterInput?: string;
  readonly filterSelect?: string;
  readonly filterCheckbox?: string;
  readonly filterHeaderButton?: string;
  readonly editableCell?: string;
  readonly editCellActivate?: string;
  readonly editCellEditor?: string;
  readonly editCellError?: string;
  readonly editCellSaveError?: string;
  readonly editCellRollback?: string;
  readonly editCellConflictButton?: string;
  readonly rowEditActions?: string;
  readonly rowEditButton?: string;
  readonly batchEditBar?: string;
  readonly batchEditButton?: string;
  readonly editHistory?: string;
  readonly undoButton?: string;
  readonly redoButton?: string;
  readonly filterChecklist?: string;
  readonly filterChecklistSearch?: string;
  readonly filterChecklistActions?: string;
  readonly filterChecklistList?: string;
  readonly filterChecklistCount?: string;
  readonly filterCheckboxGroup?: string;
  readonly filterTree?: string;
  readonly filterTreeGroup?: string;
  readonly filterTreeCondition?: string;
  readonly filterTreeActions?: string;
  readonly filterTreeRemove?: string;
  readonly filterTreeSummary?: string;
  readonly filterOperator?: string;
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
  readonly assistant?: TableAssistantProps;
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
  readonly density?: TableDensity;
  readonly defaultDensity?: TableDensity;
  readonly onDensityChange?: (density: TableDensity) => void;
  readonly confirm?: ConfirmHandler;
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
