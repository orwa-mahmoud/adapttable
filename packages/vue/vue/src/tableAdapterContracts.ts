import type {
  CellEdit,
  ColumnLayoutState,
  ConfirmHandler,
  Direction,
  PaginationMode,
  RowActionsLayout,
  TableErrorState,
  TableLabels,
  TableSource,
  TableViewStateConfig,
  UrlStateAdapter,
} from "@adapttable/core";
import type { TableDensity } from "@adapttable/core/binding";
import type { VNodeChild } from "vue";

import type { SummaryRowFn } from "./aggregate/aggregate";
import type { TableAssistantProps } from "./assistant/contracts";
import type {
  CellContext,
  ColumnInput,
  FooterContext,
  HeaderContext,
} from "./columnDef";
import type { ComposedFeature } from "./features/tableFeature";
import type { CellRange } from "./navigation/contracts";

/** CSS hooks for the corresponding table or control presentation target. */
export interface DataTableClassNames {
  readonly chips?: string;
  readonly chip?: string;
  readonly chipRemove?: string;
  readonly agentApproval?: string;
  readonly agentApprovalButton?: string;
  readonly summary?: string;
  readonly summaryRow?: string;
  readonly summaryCell?: string;
  readonly summaryCard?: string;
  readonly tableFooter?: string;
  readonly densityToggle?: string;
  readonly fullscreenToggle?: string;
  readonly filtersAnchor?: string;
  readonly filtersHeader?: string;
  readonly filtersTitle?: string;
  readonly filtersBody?: string;
  readonly filtersFooter?: string;
  readonly filtersClose?: string;
  readonly filtersIcon?: string;
  readonly filtersCount?: string;
  readonly filterOptionsLoading?: string;
  readonly filterHeaderTrigger?: string;

  readonly groupCell?: string;
  readonly groupCard?: string;
  readonly groupSelect?: string;
  readonly groupFooterRow?: string;
  readonly groupFooterCell?: string;
  readonly groupMoreRow?: string;
  readonly groupMoreCell?: string;
  readonly expandButton?: string;
  readonly expandCell?: string;

  readonly selectAllText?: string;
  readonly commandInput?: string;
  readonly commandItem?: string;
  readonly commandEmpty?: string;
  readonly contextMenuItem?: string;
  readonly contextMenuSeparator?: string;
  readonly sidePanelTab?: string;
  readonly sidePanelClose?: string;
  readonly exportProgress?: string;
  readonly exportProgressBar?: string;
  readonly exportProgressMessage?: string;
  readonly exportProgressButton?: string;
  readonly exportProgressDownload?: string;

  readonly bulkBar?: string;
  readonly bulkCount?: string;
  readonly bulkButton?: string;
  readonly bulkClear?: string;
  readonly bulkError?: string;
  readonly selectAllBanner?: string;
  readonly selectAllButton?: string;
  readonly commandPalette?: string;
  readonly commandPaletteButton?: string;
  readonly contextMenu?: string;
  readonly sidePanel?: string;
  readonly sidePanelHeader?: string;
  readonly sidePanelTabs?: string;
  readonly sidePanelBody?: string;
  readonly exportCsvButton?: string;
  readonly exportSpinner?: string;
  readonly printButton?: string;

  readonly columnMenu?: string;
  readonly columnMenuButton?: string;
  readonly columnMenuPanel?: string;
  readonly columnMenuHeader?: string;
  readonly columnMenuTitle?: string;
  readonly columnMenuSearch?: string;
  readonly columnMenuBulk?: string;
  readonly columnMenuBulkButton?: string;
  readonly columnMenuItem?: string;
  readonly columnMenuGrip?: string;
  readonly columnMenuVisibility?: string;
  readonly columnMenuLabel?: string;
  readonly columnMenuPin?: string;
  readonly columnMenuMore?: string;
  readonly columnMenuSubmenu?: string;
  readonly columnMenuAction?: string;
  readonly columnMenuChoice?: string;
  readonly columnMenuChoiceLabel?: string;
  readonly columnMenuChoiceSelect?: string;
  readonly columnMenuSeparator?: string;
  readonly columnMenuAutoSize?: string;
  readonly columnMenuReset?: string;
  readonly columnRenameForm?: string;
  readonly columnRenameLabel?: string;
  readonly columnRenameInput?: string;
  readonly columnRenameError?: string;
  readonly columnRenameSave?: string;
  readonly columnRenameCancel?: string;
  readonly columnRenameAnnouncer?: string;
  readonly headerRenameButton?: string;
  readonly headerRenameForm?: string;
  readonly headerRenameLabel?: string;
  readonly headerRenameInput?: string;
  readonly headerRenameError?: string;
  readonly headerRenameSave?: string;
  readonly headerRenameCancel?: string;
  readonly headerRenameAnnouncer?: string;

  readonly columnSelect?: string;
  readonly fillHandle?: string;
  readonly findBar?: string;
  readonly findInput?: string;
  readonly findButton?: string;
  readonly statusBar?: string;
  readonly statusItem?: string;
  readonly selectionStats?: string;
  readonly resizeHandle?: string;
  readonly filterHeaderInput?: string;
  readonly headerCell?: string;
  readonly expandHeader?: string;
  readonly filterHeaderRow?: string;
  readonly filterHeaderCell?: string;
  readonly filterHeaderMenu?: string;
  readonly actionsHeader?: string;
  readonly actionsCell?: string;
  readonly reorderHeader?: string;
  readonly reorderCell?: string;
  readonly rowReorderHandle?: string;
  readonly rowReorderButtons?: string;
  readonly rowReorderUp?: string;
  readonly rowReorderDown?: string;
  readonly virtualSpacer?: string;
  readonly cardActions?: string;
  /** Legacy alias for actionButton; both classes reach the action button. */
  readonly rowAction?: string;
  readonly actionButton?: string;
  readonly rowActionsMenu?: string;
  readonly rowActionsTrigger?: string;
  readonly addRow?: string;
  readonly groupRow?: string;
  readonly groupLabel?: string;
  readonly groupToggle?: string;
  readonly groupCount?: string;
  readonly groupAggregate?: string;
  readonly groupMore?: string;
  readonly groupCheckbox?: string;
  readonly groupingPanel?: string;
  readonly groupingDropZone?: string;
  readonly groupingItem?: string;
  readonly groupingChip?: string;
  readonly groupingChipHandle?: string;
  readonly groupingChipRemove?: string;
  readonly groupingAdd?: string;
  readonly groupingAggregations?: string;
  readonly groupingAggregationItem?: string;
  readonly groupingAggregationOperation?: string;
  readonly groupingAggregationRemove?: string;
  readonly groupingAggregationAdd?: string;
  readonly groupingAggregationsRestore?: string;
  readonly groupingRemoveZone?: string;
  readonly treeCell?: string;
  readonly treeToggle?: string;
  readonly treeSpacer?: string;
  readonly expandToggle?: string;
  readonly detailRow?: string;
  readonly detailCell?: string;
  readonly cardDetail?: string;
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
  readonly filtersBackdrop?: string;
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
  readonly searchIcon?: string;
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
  readonly sortIndex?: string;
  readonly headerActions?: string;
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
  readonly loadingTable?: string;
  readonly loadingHeaderRow?: string;
  readonly loadingHeaderCell?: string;
  readonly loadingRow?: string;
  readonly loadingCell?: string;
  readonly loadingCards?: string;
  readonly loadingCard?: string;
  readonly loadingLine?: string;
  readonly loadMore?: string;
  readonly loadMoreButton?: string;
  readonly empty?: string;
  readonly emptyClear?: string;
  readonly error?: string;
  readonly retry?: string;
  readonly refreshing?: string;
  readonly gridAnnouncer?: string;
  readonly rowReorderAnnouncer?: string;
  readonly tableStatusAnnouncer?: string;
  /** Legacy alias for tableStatusAnnouncer. */
  readonly status?: string;
}

/** Shared adapter props. Query state is owned by the supplied source when present. */
export interface DataTableProps<TRow> {
  readonly assistant?: TableAssistantProps;
  readonly onCellPaste?: (edits: CellEdit<TRow>[]) => void;
  readonly onCellFill?: (edits: CellEdit<TRow>[]) => void;
  readonly onCellCut?: (range: CellRange) => void;
  readonly data?: readonly TRow[];
  readonly source?: TableSource<TRow>;
  readonly columns: readonly ColumnInput<TRow>[];
  readonly rowKey: (row: TRow) => string;
  readonly features?: readonly ComposedFeature<NoInfer<TRow>>[];
  /** Build footer values from the current source row scope. */
  readonly summaryRow?: SummaryRowFn<TRow>;
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
  /** Number of loading rows or cards; defaults to the current page size. */
  readonly skeletonRows?: number;
  readonly isLoading?: boolean;
  readonly isFetching?: boolean;
  readonly error?: Error | null;
  readonly refetch?: () => void | Promise<unknown>;
  readonly density?: TableDensity;
  readonly defaultDensity?: TableDensity;
  readonly onDensityChange?: (density: TableDensity) => void;
  readonly confirm?: ConfirmHandler;
  /** Omit or use buttons for the inline strip; menu uses the kit menu control. */
  readonly rowActionsLayout?: RowActionsLayout;
  readonly classNames?: DataTableClassNames;
}

/** Per-column renderers take precedence over cell/header table slots. */
export interface DataTableSlots<TRow> {
  cell?: (context: CellContext<TRow>) => VNodeChild;
  header?: (context: HeaderContext<TRow>) => VNodeChild;
  /** Column headerActions takes precedence over this fallback. */
  headerActions?: (context: HeaderContext<TRow>) => VNodeChild;
  /** Fallback footer cell renderer; a column footer takes precedence. */
  footer?: (context: FooterContext<TRow>) => VNodeChild;
  /** Free content below the table and above pagination. */
  tableFooter?: () => VNodeChild;
  toolbar?: () => VNodeChild;
  loading?: () => VNodeChild;
  empty?: (state: {
    readonly noResults: boolean;
    readonly clear: () => void;
  }) => VNodeChild;
  error?: (state: TableErrorState) => VNodeChild;
}
