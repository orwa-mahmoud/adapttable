/**
 * The adapter machinery, framework-neutral — `@adapttable/core/binding`.
 *
 * Column-group, extra-row, pinned-row, row-span, row-style and column-menu
 * math that every kit's rendering shares. `@adapttable/react/adapter` re-exports
 * all of it beside the React-bound helpers, and is where an adapter imports
 * it from; this entry is the React-free half that binding is built on.
 *
 * @packageDocumentation
 */
export {
  columnMenuActions,
  filterColumnMenuRows,
  hideAllColumns,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
} from "./columns/columnMenuModel";
export {
  applyCollapsedColumnGroups,
  flattenColumnTree,
} from "./columns/columnTree";
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
export {
  bodyCellsHaveRowSpan,
  cellsForRow,
  extraHostFillStyle,
  isExtraEntry,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  REORDER_COLUMN_WIDTH,
  resolveRowStyle,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSpanSignature,
  rowStyleSignature,
} from "./layout/leanAssembly";
export { type BodyCell, cellSpanMark } from "./rows/cellSpan";
export {
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraCountBeforeRowIds,
  extraCoveredTableSlots,
  extraRowsForSection,
  extraUncoveredColSpans,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
} from "./rows/extraRows";
export {
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowStickyStyle,
} from "./rows/pinnedRowChrome";
export { resolveRowHeight } from "./rows/rowPresentation";
export { rowSourceIndex } from "./virtual/virtualTableModel";
