/**
 * The adapter machinery the main entry still serves, each name marked for
 * removal in the declaration a consumer's editor reads.
 *
 * Each value is the same object `@adapttable/core/binding` and
 * `@adapttable/react/adapter` export, so it compares equal across imports.
 */
import * as columnMenuModel from "./columns/columnMenuModel";
import * as columnTree from "./columns/columnTree";
import * as headerGroups from "./columns/headerGroups";
import * as leanAssembly from "./layout/leanAssembly";
import * as cellSpan from "./rows/cellSpan";
import * as extraRows from "./rows/extraRows";
import * as pinnedRowChrome from "./rows/pinnedRowChrome";
import * as rowPresentation from "./rows/rowPresentation";
import * as virtualTableModel from "./virtual/virtualTableModel";
import * as xlsx from "./xlsx";

/** @deprecated Import from `@adapttable/react/adapter`. */
export const columnMenuActions: typeof columnMenuModel.columnMenuActions =
  columnMenuModel.columnMenuActions;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const filterColumnMenuRows: typeof columnMenuModel.filterColumnMenuRows =
  columnMenuModel.filterColumnMenuRows;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const hideAllColumns: typeof columnMenuModel.hideAllColumns =
  columnMenuModel.hideAllColumns;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const resetColumnLayout: typeof columnMenuModel.resetColumnLayout =
  columnMenuModel.resetColumnLayout;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const showAllColumns: typeof columnMenuModel.showAllColumns =
  columnMenuModel.showAllColumns;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const unpinAllColumns: typeof columnMenuModel.unpinAllColumns =
  columnMenuModel.unpinAllColumns;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const applyCollapsedColumnGroups: typeof columnTree.applyCollapsedColumnGroups =
  columnTree.applyCollapsedColumnGroups;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const flattenColumnTree: typeof columnTree.flattenColumnTree =
  columnTree.flattenColumnTree;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const COLUMN_GROUP_ID_SEP: typeof headerGroups.COLUMN_GROUP_ID_SEP =
  headerGroups.COLUMN_GROUP_ID_SEP;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const COLUMN_GROUP_RENDER_PREFIX: typeof headerGroups.COLUMN_GROUP_RENDER_PREFIX =
  headerGroups.COLUMN_GROUP_RENDER_PREFIX;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const COLUMN_GROUP_STUB_PREFIX: typeof headerGroups.COLUMN_GROUP_STUB_PREFIX =
  headerGroups.COLUMN_GROUP_STUB_PREFIX;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const COLUMN_GROUP_STUB_WIDTH: typeof headerGroups.COLUMN_GROUP_STUB_WIDTH =
  headerGroups.COLUMN_GROUP_STUB_WIDTH;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const columnGroupHeaderCaption: typeof headerGroups.columnGroupHeaderCaption =
  headerGroups.columnGroupHeaderCaption;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const columnGroupId: typeof headerGroups.columnGroupId =
  headerGroups.columnGroupId;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const columnGroupPath: typeof headerGroups.columnGroupPath =
  headerGroups.columnGroupPath;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const columnGroupStubStyle: typeof headerGroups.columnGroupStubStyle =
  headerGroups.columnGroupStubStyle;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const groupedHeaderAlign: typeof headerGroups.groupedHeaderAlign =
  headerGroups.groupedHeaderAlign;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const groupedHeaderCellStyle: typeof headerGroups.groupedHeaderCellStyle =
  headerGroups.groupedHeaderCellStyle;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const groupedHeaderChildRule: typeof headerGroups.groupedHeaderChildRule =
  headerGroups.groupedHeaderChildRule;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const groupedHeaderLabelStyle: typeof headerGroups.groupedHeaderLabelStyle =
  headerGroups.groupedHeaderLabelStyle;
/** @deprecated Import from `@adapttable/react/adapter`. */
export type HeaderGroupCell = headerGroups.HeaderGroupCell;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const headerGroupRow: typeof headerGroups.headerGroupRow =
  headerGroups.headerGroupRow;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const headerGroupRows: typeof headerGroups.headerGroupRows =
  headerGroups.headerGroupRows;
/** @deprecated Import from `@adapttable/react/adapter`. */
export type HtmlGroupedHeaderCell = headerGroups.HtmlGroupedHeaderCell;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const htmlGroupedHeaderPlan: typeof headerGroups.htmlGroupedHeaderPlan =
  headerGroups.htmlGroupedHeaderPlan;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const isColumnGroupRenderKey: typeof headerGroups.isColumnGroupRenderKey =
  headerGroups.isColumnGroupRenderKey;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const isColumnGroupStubKey: typeof headerGroups.isColumnGroupStubKey =
  headerGroups.isColumnGroupStubKey;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const isColumnGroupSummaryKey: typeof headerGroups.isColumnGroupSummaryKey =
  headerGroups.isColumnGroupSummaryKey;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const toggleCollapsedColumnGroup: typeof headerGroups.toggleCollapsedColumnGroup =
  headerGroups.toggleCollapsedColumnGroup;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const bodyCellsHaveRowSpan: typeof leanAssembly.bodyCellsHaveRowSpan =
  leanAssembly.bodyCellsHaveRowSpan;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const cellsForRow: typeof leanAssembly.cellsForRow =
  leanAssembly.cellsForRow;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const extraHostFillStyle: typeof leanAssembly.extraHostFillStyle =
  leanAssembly.extraHostFillStyle;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const isExtraEntry: typeof leanAssembly.isExtraEntry =
  leanAssembly.isExtraEntry;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const pinnedRowCellStyle: typeof leanAssembly.pinnedRowCellStyle =
  leanAssembly.pinnedRowCellStyle;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const pinnedRowPart: typeof leanAssembly.pinnedRowPart =
  leanAssembly.pinnedRowPart;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const pinnedRowSticky: typeof leanAssembly.pinnedRowSticky =
  leanAssembly.pinnedRowSticky;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const REORDER_COLUMN_WIDTH: typeof leanAssembly.REORDER_COLUMN_WIDTH =
  leanAssembly.REORDER_COLUMN_WIDTH;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const resolveRowStyle: typeof leanAssembly.resolveRowStyle =
  leanAssembly.resolveRowStyle;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const rowPinSignature: typeof leanAssembly.rowPinSignature =
  leanAssembly.rowPinSignature;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const rowReorderDropStyle: typeof leanAssembly.rowReorderDropStyle =
  leanAssembly.rowReorderDropStyle;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const rowReorderSignature: typeof leanAssembly.rowReorderSignature =
  leanAssembly.rowReorderSignature;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const rowSpanSignature: typeof leanAssembly.rowSpanSignature =
  leanAssembly.rowSpanSignature;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const rowStyleSignature: typeof leanAssembly.rowStyleSignature =
  leanAssembly.rowStyleSignature;
/** @deprecated Import from `@adapttable/react/adapter`. */
export type BodyCell<TRow> = cellSpan.BodyCell<TRow>;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const cellSpanMark: typeof cellSpan.cellSpanMark = cellSpan.cellSpanMark;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const EXTRA_OVER_SPAN_ROW_STYLE: typeof extraRows.EXTRA_OVER_SPAN_ROW_STYLE =
  extraRows.EXTRA_OVER_SPAN_ROW_STYLE;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const EXTRA_OVER_SPAN_STYLE: typeof extraRows.EXTRA_OVER_SPAN_STYLE =
  extraRows.EXTRA_OVER_SPAN_STYLE;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const EXTRA_ROW_PARTS: typeof extraRows.EXTRA_ROW_PARTS =
  extraRows.EXTRA_ROW_PARTS;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const extraCountBeforeRowIds: typeof extraRows.extraCountBeforeRowIds =
  extraRows.extraCountBeforeRowIds;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const extraCoveredTableSlots: typeof extraRows.extraCoveredTableSlots =
  extraRows.extraCoveredTableSlots;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const extraRowsForSection: typeof extraRows.extraRowsForSection =
  extraRows.extraRowsForSection;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const extraUncoveredColSpans: typeof extraRows.extraUncoveredColSpans =
  extraRows.extraUncoveredColSpans;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const inflateBodyCellRowSpans: typeof extraRows.inflateBodyCellRowSpans =
  extraRows.inflateBodyCellRowSpans;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const insertExtraRows: typeof extraRows.insertExtraRows =
  extraRows.insertExtraRows;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const insertExtrasBeforeRows: typeof extraRows.insertExtrasBeforeRows =
  extraRows.insertExtrasBeforeRows;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const orderedCardEntries: typeof pinnedRowChrome.orderedCardEntries =
  pinnedRowChrome.orderedCardEntries;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const PINNED_BOTTOM_PART: typeof pinnedRowChrome.PINNED_BOTTOM_PART =
  pinnedRowChrome.PINNED_BOTTOM_PART;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const PINNED_TOP_PART: typeof pinnedRowChrome.PINNED_TOP_PART =
  pinnedRowChrome.PINNED_TOP_PART;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const pinnedRowStickyStyle: typeof pinnedRowChrome.pinnedRowStickyStyle =
  pinnedRowChrome.pinnedRowStickyStyle;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const resolveRowHeight: typeof rowPresentation.resolveRowHeight =
  rowPresentation.resolveRowHeight;
/** @deprecated Import from `@adapttable/react/adapter`. */
export const rowSourceIndex: typeof virtualTableModel.rowSourceIndex =
  virtualTableModel.rowSourceIndex;
/** @deprecated Import from `@adapttable/core/xlsx`. */
export const buildTableXlsx: typeof xlsx.buildTableXlsx = xlsx.buildTableXlsx;
/** @deprecated Import from `@adapttable/core/xlsx`. */
export const xlsxWriter: typeof xlsx.xlsxWriter = xlsx.xlsxWriter;
