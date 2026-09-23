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

/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnMenuActions: typeof columnMenuModel.columnMenuActions =
  columnMenuModel.columnMenuActions;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const filterColumnMenuRows: typeof columnMenuModel.filterColumnMenuRows =
  columnMenuModel.filterColumnMenuRows;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const hideAllColumns: typeof columnMenuModel.hideAllColumns =
  columnMenuModel.hideAllColumns;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const resetColumnLayout: typeof columnMenuModel.resetColumnLayout =
  columnMenuModel.resetColumnLayout;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const showAllColumns: typeof columnMenuModel.showAllColumns =
  columnMenuModel.showAllColumns;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const unpinAllColumns: typeof columnMenuModel.unpinAllColumns =
  columnMenuModel.unpinAllColumns;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const applyCollapsedColumnGroups: typeof columnTree.applyCollapsedColumnGroups =
  columnTree.applyCollapsedColumnGroups;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const flattenColumnTree: typeof columnTree.flattenColumnTree =
  columnTree.flattenColumnTree;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const COLUMN_GROUP_ID_SEP: typeof headerGroups.COLUMN_GROUP_ID_SEP =
  headerGroups.COLUMN_GROUP_ID_SEP;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const COLUMN_GROUP_RENDER_PREFIX: typeof headerGroups.COLUMN_GROUP_RENDER_PREFIX =
  headerGroups.COLUMN_GROUP_RENDER_PREFIX;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const COLUMN_GROUP_STUB_PREFIX: typeof headerGroups.COLUMN_GROUP_STUB_PREFIX =
  headerGroups.COLUMN_GROUP_STUB_PREFIX;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const COLUMN_GROUP_STUB_WIDTH: typeof headerGroups.COLUMN_GROUP_STUB_WIDTH =
  headerGroups.COLUMN_GROUP_STUB_WIDTH;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnGroupHeaderCaption: typeof headerGroups.columnGroupHeaderCaption =
  headerGroups.columnGroupHeaderCaption;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnGroupId: typeof headerGroups.columnGroupId =
  headerGroups.columnGroupId;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnGroupPath: typeof headerGroups.columnGroupPath =
  headerGroups.columnGroupPath;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const columnGroupStubStyle: typeof headerGroups.columnGroupStubStyle =
  headerGroups.columnGroupStubStyle;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const groupedHeaderAlign: typeof headerGroups.groupedHeaderAlign =
  headerGroups.groupedHeaderAlign;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const groupedHeaderCellStyle: typeof headerGroups.groupedHeaderCellStyle =
  headerGroups.groupedHeaderCellStyle;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const groupedHeaderChildRule: typeof headerGroups.groupedHeaderChildRule =
  headerGroups.groupedHeaderChildRule;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const groupedHeaderLabelStyle: typeof headerGroups.groupedHeaderLabelStyle =
  headerGroups.groupedHeaderLabelStyle;
/**
 * The adapter type of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type HeaderGroupCell = headerGroups.HeaderGroupCell;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const headerGroupRow: typeof headerGroups.headerGroupRow =
  headerGroups.headerGroupRow;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const headerGroupRows: typeof headerGroups.headerGroupRows =
  headerGroups.headerGroupRows;
/**
 * The adapter type of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type HtmlGroupedHeaderCell = headerGroups.HtmlGroupedHeaderCell;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const htmlGroupedHeaderPlan: typeof headerGroups.htmlGroupedHeaderPlan =
  headerGroups.htmlGroupedHeaderPlan;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const isColumnGroupRenderKey: typeof headerGroups.isColumnGroupRenderKey =
  headerGroups.isColumnGroupRenderKey;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const isColumnGroupStubKey: typeof headerGroups.isColumnGroupStubKey =
  headerGroups.isColumnGroupStubKey;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const isColumnGroupSummaryKey: typeof headerGroups.isColumnGroupSummaryKey =
  headerGroups.isColumnGroupSummaryKey;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const toggleCollapsedColumnGroup: typeof headerGroups.toggleCollapsedColumnGroup =
  headerGroups.toggleCollapsedColumnGroup;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const bodyCellsHaveRowSpan: typeof leanAssembly.bodyCellsHaveRowSpan =
  leanAssembly.bodyCellsHaveRowSpan;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const cellsForRow: typeof leanAssembly.cellsForRow =
  leanAssembly.cellsForRow;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const extraHostFillStyle: typeof leanAssembly.extraHostFillStyle =
  leanAssembly.extraHostFillStyle;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const isExtraEntry: typeof leanAssembly.isExtraEntry =
  leanAssembly.isExtraEntry;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const pinnedRowCellStyle: typeof leanAssembly.pinnedRowCellStyle =
  leanAssembly.pinnedRowCellStyle;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const pinnedRowPart: typeof leanAssembly.pinnedRowPart =
  leanAssembly.pinnedRowPart;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const pinnedRowSticky: typeof leanAssembly.pinnedRowSticky =
  leanAssembly.pinnedRowSticky;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const REORDER_COLUMN_WIDTH: typeof leanAssembly.REORDER_COLUMN_WIDTH =
  leanAssembly.REORDER_COLUMN_WIDTH;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const resolveRowStyle: typeof leanAssembly.resolveRowStyle =
  leanAssembly.resolveRowStyle;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const rowPinSignature: typeof leanAssembly.rowPinSignature =
  leanAssembly.rowPinSignature;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const rowReorderDropStyle: typeof leanAssembly.rowReorderDropStyle =
  leanAssembly.rowReorderDropStyle;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const rowReorderSignature: typeof leanAssembly.rowReorderSignature =
  leanAssembly.rowReorderSignature;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const rowSpanSignature: typeof leanAssembly.rowSpanSignature =
  leanAssembly.rowSpanSignature;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const rowStyleSignature: typeof leanAssembly.rowStyleSignature =
  leanAssembly.rowStyleSignature;
/**
 * The adapter type of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export type BodyCell<TRow> = cellSpan.BodyCell<TRow>;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const cellSpanMark: typeof cellSpan.cellSpanMark = cellSpan.cellSpanMark;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const EXTRA_OVER_SPAN_ROW_STYLE: typeof extraRows.EXTRA_OVER_SPAN_ROW_STYLE =
  extraRows.EXTRA_OVER_SPAN_ROW_STYLE;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const EXTRA_OVER_SPAN_STYLE: typeof extraRows.EXTRA_OVER_SPAN_STYLE =
  extraRows.EXTRA_OVER_SPAN_STYLE;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const EXTRA_ROW_PARTS: typeof extraRows.EXTRA_ROW_PARTS =
  extraRows.EXTRA_ROW_PARTS;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const extraCountBeforeRowIds: typeof extraRows.extraCountBeforeRowIds =
  extraRows.extraCountBeforeRowIds;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const extraCoveredTableSlots: typeof extraRows.extraCoveredTableSlots =
  extraRows.extraCoveredTableSlots;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const extraRowsForSection: typeof extraRows.extraRowsForSection =
  extraRows.extraRowsForSection;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const extraUncoveredColSpans: typeof extraRows.extraUncoveredColSpans =
  extraRows.extraUncoveredColSpans;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const inflateBodyCellRowSpans: typeof extraRows.inflateBodyCellRowSpans =
  extraRows.inflateBodyCellRowSpans;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const insertExtraRows: typeof extraRows.insertExtraRows =
  extraRows.insertExtraRows;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const insertExtrasBeforeRows: typeof extraRows.insertExtrasBeforeRows =
  extraRows.insertExtrasBeforeRows;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const orderedCardEntries: typeof pinnedRowChrome.orderedCardEntries =
  pinnedRowChrome.orderedCardEntries;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const PINNED_BOTTOM_PART: typeof pinnedRowChrome.PINNED_BOTTOM_PART =
  pinnedRowChrome.PINNED_BOTTOM_PART;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const PINNED_TOP_PART: typeof pinnedRowChrome.PINNED_TOP_PART =
  pinnedRowChrome.PINNED_TOP_PART;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const pinnedRowStickyStyle: typeof pinnedRowChrome.pinnedRowStickyStyle =
  pinnedRowChrome.pinnedRowStickyStyle;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const resolveRowHeight: typeof rowPresentation.resolveRowHeight =
  rowPresentation.resolveRowHeight;
/**
 * The adapter helper of the same name from `@adapttable/react/adapter`.
 *
 * @deprecated Import from `@adapttable/react/adapter`.
 * @public
 */
export const rowSourceIndex: typeof virtualTableModel.rowSourceIndex =
  virtualTableModel.rowSourceIndex;
/**
 * The workbook writer of the same name from `@adapttable/core/xlsx`.
 *
 * @deprecated Import from `@adapttable/core/xlsx`.
 * @public
 */
export const buildTableXlsx: typeof xlsx.buildTableXlsx = xlsx.buildTableXlsx;
/**
 * The workbook writer of the same name from `@adapttable/core/xlsx`.
 *
 * @deprecated Import from `@adapttable/core/xlsx`.
 * @public
 */
export const xlsxWriter: typeof xlsx.xlsxWriter = xlsx.xlsxWriter;
