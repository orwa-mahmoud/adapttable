/**
 * `@adapttable/core/adapter` — the builder tier.
 *
 * Everything the eight built-in adapters are made of, published for anyone
 * wiring a ninth: the shared `<DataTable>` orchestration
 * ({@link useDataTableShell}), the render prelude, chrome prop bundles,
 * pinning and pager math, keyed virtualization, and the inline icon set.
 * Same package, same semver promise as the main entry — split out so the
 * app-facing API at `@adapttable/core` stays small. App code should rarely
 * (if ever) import from here.
 *
 * @packageDocumentation
 */

export { LiveRegion, type LiveRegionProps } from "./a11y/LiveRegion";
export {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "./actions/CommandPaletteChrome";
export { resolveDisabledReason } from "./actions/confirm";
export {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "./actions/ContextMenuChrome";
export {
  resolveContextTarget,
  type ResolvedContextTarget,
  ROW_ID_ATTRIBUTE,
} from "./actions/contextMenuRegion";
export { bulkActionErrorMessage } from "./actions/useBulkActionRunner";
export {
  type BulkBarState,
  useBulkBarState,
  type UseBulkBarStateOptions,
} from "./actions/useBulkBarState";
export {
  type TableCommandPalette,
  useCommandPalette,
} from "./actions/useCommandPalette";
export {
  type TableContextMenu,
  useTableContextMenu,
} from "./actions/useTableContextMenu";
export {
  type ColumnGroupToggleButtonProps,
  ColumnGroupToggleChrome,
  type ColumnGroupToggleChromeProps,
  type ColumnGroupToggleProps,
  type ColumnGroupToggleSlots,
} from "./columns/ColumnGroupToggle";
export {
  type ColumnMenuAction,
  type ColumnMenuActionContext,
  columnMenuActions,
  type ColumnMenuChromeProps,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  filterColumnMenuRows,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  type PinnedSide,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
} from "./columns/columnMenuModel";
export {
  COLUMN_DND_MIME,
  type ColumnDragRowAttrs,
  type ColumnDragState,
  type ColumnDropProps,
  type ColumnReorderKeyProps,
  type ColumnRowDragProps,
} from "./columns/columnReorder";
export { type ColumnResizeHandleProps } from "./columns/columnResize";
export {
  columnFlexShares,
  columnSizeStyle,
  type ColumnSizingOptions,
  fittedTableStyle,
} from "./columns/columnSizing";
export {
  applyCollapsedColumnGroups,
  type ColumnGroupDef,
  type ColumnInput,
  flattenColumnTree,
} from "./columns/columnTree";
export { pinnedColumnWidth } from "./columns/columnWidths";
export {
  COLUMN_GROUP_ID_SEP,
  COLUMN_GROUP_RENDER_PREFIX,
  COLUMN_GROUP_STUB_PREFIX,
  COLUMN_GROUP_STUB_WIDTH,
  columnGroupHeaderCaption,
  columnGroupId,
  columnGroupPath,
  columnGroupStubStyle,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderChildRule,
  groupedHeaderLabelStyle,
  type HeaderGroupCell,
  headerGroupRow,
  headerGroupRows,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
  isColumnGroupRenderKey,
  isColumnGroupStubKey,
  isColumnGroupSummaryKey,
  toggleCollapsedColumnGroup,
} from "./columns/headerGroups";
export { EyeIcon, GripIcon, PinIcon } from "./columns/icons";
export {
  type PinLeads,
  type PinnedCellStyle,
  type PinOffset,
} from "./columns/useColumnLayout";
export { DEFAULT_CARD_SIZE_PX } from "./constants";
export {
  cellHighlightStyle,
  groupIndentStyle,
  type GroupRowKind,
  groupRowParts,
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  logicalAlign,
  mergedCellStyle,
  pinnedDataCellStyle,
  pinnedEdgeCellStyle,
  resolveMobileLabel,
  shallowEqualByKeys,
  SHARED_DESKTOP_ROW_KEYS,
  sortArrow,
} from "./display";
export {
  focusEditorOnMount,
  rowEditingSignature,
  rowIsDirty,
} from "./editing/editableCellController";
export {
  commitBooleanDraft,
  type EditableCellActivateProps,
  type EditableCellButtonProps,
  type EditableCellSlots,
  editorBusyProps,
  editorValidationProps,
  multiDraftFromSelect,
} from "./editing/EditableCellGate";
export {
  BatchEditBarChrome,
  type BatchEditBarChromeProps,
  type BatchEditBarProps,
  type BatchEditBarSlots,
  type BatchEditButtonProps,
  BatchEditCell,
  type BatchEditCellProps,
  RowEditActionsChrome,
  type RowEditActionsChromeProps,
  type RowEditActionsProps,
  type RowEditActionsSlots,
  type RowEditButtonProps,
  RowEditCell,
  type RowEditCellProps,
  type RowEditControls,
  rowEditControls,
  type RowEditControlsOptions,
} from "./editing/RowEditGate";
export {
  ExportAnnouncer,
  type ExportAnnouncerProps,
} from "./export/ExportAnnouncer";
export { exportButtonLabel } from "./export/exportLabel";
export {
  type ExportHandlerState,
  type ExportStatus,
  useExportHandler,
} from "./export/useExportHandler";
export { bindFeatureHostFn } from "./features/currentHost";
export { useTableFeatures } from "./features/featureHost";
export { featureHostOf, rememberFeatureHost } from "./features/featureHost";
export {
  FeatureHostProvider,
  useFeatureHost,
} from "./features/featureHostContext";
export type { TableFeature, TableFeatureHost } from "./features/tableFeature";
export { applyTableFeatures } from "./features/tableFeature";
export {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  ChecklistChrome,
  type ChecklistChromeProps,
  type ChecklistClassNames,
  type ChecklistFilterProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "./filters/ChecklistChrome";
export {
  FilterHeaderChrome,
  type FilterHeaderChromeProps,
  type FilterHeaderClassNames,
  FilterHeaderControlChrome,
  type FilterHeaderControlChromeProps,
  type FilterHeaderControlProps,
  type FilterHeaderMultiProps,
  type FilterHeaderOption,
  type FilterHeaderRangeProps,
  type FilterHeaderRowProps,
  type FilterHeaderSearchProps,
  type FilterHeaderSelectProps,
  type FilterHeaderSlots,
} from "./filters/FilterHeaderRow";
export {
  type FilterTreeBuilderProps,
  type FilterTreeButtonProps,
  FilterTreeChrome,
  type FilterTreeChromeProps,
  type FilterTreeClassNames,
  type FilterTreeDisclosureProps,
  type FilterTreeInputProps,
  type FilterTreeOption,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "./filters/FilterTreeChrome";
export {
  FindBarChrome,
  type FindBarChromeProps,
  type FindBarProps,
  type FindBarSlots,
  type FindButtonKind,
  type FindButtonProps,
  type FindSearchProps,
} from "./find/FindBar";
export {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  type ColumnSelectCheckboxProps,
  columnSelectLabel,
  type ColumnSelectSlots,
} from "./focus/ColumnSelectCheckbox";
export {
  FillHandleChrome,
  type FillHandleChromeProps,
  type FillHandleSlotProps,
  type FillHandleSlots,
} from "./focus/FillHandle";
export {
  GridFocusAnnouncer,
  type GridFocusAnnouncerProps,
} from "./focus/GridFocusAnnouncer";
export {
  type SelectionStatPart,
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlotProps,
  type SelectionStatsSlots,
} from "./focus/SelectionStatsBar";
export {
  type FeatureNotice,
  type FeatureNoticeKind,
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarItem,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "./focus/StatusBarChrome";
export {
  GroupMoreButtonChrome,
  type GroupMoreButtonChromeProps,
  type GroupMoreButtonProps,
  type GroupMoreButtonSlotProps,
  type GroupMoreButtonSlots,
} from "./grouping/GroupMoreButton";
export { GroupToggleSpacer } from "./grouping/GroupToggleSpacer";
export {
  type MountStaggerOptions,
  useMountStagger,
} from "./hooks/useMountStagger";
export { ExpandChevron, FiltersIcon, SearchIcon } from "./icons";
export {
  createDesktopRow,
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_SELECTION_WIDTH,
  type DesktopAssemblyOptions,
  type DesktopAssemblyProps,
  type DesktopBodySlot,
  type DesktopChromeWidths,
  type DesktopExtraSlot,
  type DesktopGroupEntry,
  type DesktopGroupSlot,
  type DesktopHeaderLeaf,
  type DesktopRowSlot,
  type DesktopRowWiring,
  type DesktopTableAssembly,
  type DesktopTablePin,
  type DesktopVirtualPadSlot,
  useDesktopTableAssembly,
} from "./layout/desktopTableAssembly";
export {
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelCloseProps,
  type SidePanelFrameProps,
  SidePanelLayout,
  type SidePanelLayoutProps,
  type SidePanelSlots,
  type SidePanelTabProps,
} from "./layout/SidePanelChrome";
export { type FullscreenState, useFullscreen } from "./layout/useFullscreen";
export {
  resolveStickyToolbar,
  useStickyToolbarLayout,
} from "./layout/useStickyToolbarLayout";
export {
  type PaginationItem,
  paginationItems,
  type PaginationSlot,
  paginationSlots,
} from "./pagination/paginationMath";
export {
  type PivotAddProps,
  type PivotAggProps,
  type PivotFieldProps,
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
  type PivotPanelSurfaceProps,
  type PivotZoneProps,
} from "./pivot/PivotPanelChrome";
export { cellFlashAttr, rowFlashSignature } from "./rows/cellFlashPaint";
export {
  type BodyCell,
  bodyCellsHaveRowSpan,
  cellsForRow,
  type CellSpanAppearance,
  cellSpanMark,
  rowSpanSignature,
} from "./rows/cellSpan";
export {
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraCountBeforeRowIds,
  extraCoveredTableSlots,
  type ExtraEntry,
  extraHostFillStyle,
  type ExtraRow,
  extraRowsForSection,
  extraUncoveredColSpans,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
  isExtraEntry,
} from "./rows/extraRows";
export {
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  pinnedRowStickyStyle,
  useOffsetHeight,
} from "./rows/pinnedRowChrome";
export { type RowClickProps, rowClickProps } from "./rows/rowClickProps";
export { rowPinSignature } from "./rows/rowPinning";
export {
  REORDER_COLUMN_WIDTH,
  ROW_DND_MIME,
  rowReorderDropStyle,
  rowReorderSignature,
  type RowReorderState,
} from "./rows/rowReorder";
export {
  RowReorderAnnouncer,
  RowReorderButtonsChrome,
  type RowReorderButtonsChromeProps,
  type RowReorderButtonsProps,
  type RowReorderButtonsSlots,
  RowReorderHandleChrome,
  type RowReorderHandleChromeProps,
  type RowReorderHandleProps,
  type RowReorderHandleSlotProps,
  type RowReorderHandleSlots,
  type RowReorderMoveButtonProps,
} from "./rows/RowReorderHandle";
export {
  resolveRowHeight,
  resolveRowStyle,
  type RowHeight,
  type RowStyle,
  rowStyleSignature,
} from "./rows/rowStyle";
export { deriveSortByOptions } from "./sort/sortByOptions";
export { type DataModeProps } from "./source/useTableData";
export { fillSlot, tableErrorState } from "./state/errorState";
export {
  type SharedTableRenderProps,
  type TableRenderModel,
  tableRenderModel,
  useSummaryCells,
} from "./tableRenderProps";
export {
  nestedTableDefaults,
  nestedTableDetail,
  type NestedTableParent,
} from "./tree/nestedTable";
export {
  TreeCellChrome,
  type TreeCellChromeProps,
  type TreeCellProps,
} from "./tree/TreeCell";
export {
  type TreeToggleButtonProps,
  TreeToggleChrome,
  type TreeToggleChromeProps,
  type TreeToggleProps,
  type TreeToggleSlots,
} from "./tree/TreeToggle";
export { useResolvedAdapter } from "./url/adapter";
export {
  type SavedViewControlKey,
  type SavedViewRowControl,
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type SavedViewsPanelEmptyProps,
  type SavedViewsPanelInputProps,
  type SavedViewsPanelRowProps,
  type SavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps,
} from "./url/SavedViewsPanelChrome";
export { type SearchInputState } from "./useDataTable/useSearchInput";
export type { DataTableShellProps } from "./useDataTableShell";
export { useDataTableShell } from "./useDataTableShell";
export {
  type BulkBarChromeProps,
  type FilterTriggerToggle,
  printToolbar,
  type TableBodyRegion,
  type ToolbarChromeProps,
  undoRedoToolbar,
  type ViewControlsToolbar,
  viewControlsToolbar,
} from "./useTableChrome";
export { ColumnSpacer, type ColumnSpacerProps } from "./virtual/ColumnSpacer";
export {
  type ResizableVirtualizer,
  type RowPairMeasurer,
  useRowPairMeasurer,
} from "./virtual/measureRowPair";
export {
  bindMobileCardList,
  mobileCardListStyle,
} from "./virtual/mobileCardList";
export {
  type ColumnWindow,
  useColumnWindow,
  type UseColumnWindowOptions,
} from "./virtual/useColumnWindow";
export {
  type KeyedVirtualization,
  resolveVirtualRows,
  rowSourceIndex,
  useKeyedVirtualization,
  type VirtualTableRow,
} from "./virtual/useTableVirtualization";
