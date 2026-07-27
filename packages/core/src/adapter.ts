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

export { resolveDisabledReason } from "./actions/confirm";
export { bulkActionErrorMessage } from "./actions/useBulkActionRunner";
export {
  type BulkBarState,
  useBulkBarState,
  type UseBulkBarStateOptions,
} from "./actions/useBulkBarState";
export {
  type ColumnMenuChromeProps,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  nextPinSide,
  pinActionLabel,
  type PinnedSide,
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
export { pinnedColumnWidth } from "./columns/columnWidths";
export { type HeaderGroupCell, headerGroupRow } from "./columns/headerGroups";
export { EyeIcon, GripIcon, PinIcon } from "./columns/icons";
export {
  type PinLeads,
  type PinnedCellStyle,
  type PinOffset,
} from "./columns/useColumnLayout";
export { DEFAULT_CARD_SIZE_PX } from "./constants";
export {
  logicalAlign,
  pinnedDataCellStyle,
  pinnedEdgeCellStyle,
  shallowEqualByKeys,
  SHARED_DESKTOP_ROW_KEYS,
  sortArrow,
} from "./display";
export {
  focusEditorOnMount,
  rowEditingSignature,
} from "./editing/editableCellController";
export {
  type MountStaggerOptions,
  useMountStagger,
} from "./hooks/useMountStagger";
export { ExpandChevron, FiltersIcon, SearchIcon } from "./icons";
export {
  type PaginationItem,
  paginationItems,
  type PaginationSlot,
  paginationSlots,
} from "./pagination/paginationMath";
export { type RowClickProps, rowClickProps } from "./rows/rowClickProps";
export { deriveSortByOptions } from "./sort/sortByOptions";
export { type DataModeProps } from "./source/useTableData";
export {
  type SharedTableRenderProps,
  type TableRenderModel,
  tableRenderModel,
  useSummaryCells,
} from "./tableRenderProps";
export { useResolvedAdapter } from "./url/adapter";
export { type SearchInputState } from "./useDataTable/useSearchInput";
export {
  type DataTableShellProps,
  useDataTableShell,
} from "./useDataTableShell";
export {
  type BulkBarChromeProps,
  type FilterTriggerToggle,
  type TableBodyRegion,
  type ToolbarChromeProps,
} from "./useTableChrome";
export {
  type KeyedVirtualization,
  resolveVirtualRows,
  useKeyedVirtualization,
  type VirtualTableRow,
} from "./virtual/useTableVirtualization";
