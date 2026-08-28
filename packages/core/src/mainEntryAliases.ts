/**
 * Main-entry aliases for adapter machinery. Hosts should import these from
 * `@adapttable/core/adapter`; the aliases stay until v3 so existing imports
 * type-check with a deprecation strikethrough.
 *
 * JSDoc on `export { X } from` is not honored — each name is a real binding.
 */
import {
  columnMenuActions as columnMenuActionsImpl,
  filterColumnMenuRows as filterColumnMenuRowsImpl,
  hideAllColumns as hideAllColumnsImpl,
  resetColumnLayout as resetColumnLayoutImpl,
  showAllColumns as showAllColumnsImpl,
  unpinAllColumns as unpinAllColumnsImpl,
} from "./columns/columnMenuModel";
import {
  applyCollapsedColumnGroups as applyCollapsedColumnGroupsImpl,
  flattenColumnTree as flattenColumnTreeImpl,
} from "./columns/columnTree";
import {
  COLUMN_GROUP_ID_SEP as COLUMN_GROUP_ID_SEP_IMPL,
  COLUMN_GROUP_RENDER_PREFIX as COLUMN_GROUP_RENDER_PREFIX_IMPL,
  COLUMN_GROUP_STUB_PREFIX as COLUMN_GROUP_STUB_PREFIX_IMPL,
  COLUMN_GROUP_STUB_WIDTH as COLUMN_GROUP_STUB_WIDTH_IMPL,
  columnGroupHeaderCaption as columnGroupHeaderCaptionImpl,
  columnGroupId as columnGroupIdImpl,
  columnGroupPath as columnGroupPathImpl,
  columnGroupStubStyle as columnGroupStubStyleImpl,
  groupedHeaderAlign as groupedHeaderAlignImpl,
  groupedHeaderCellStyle as groupedHeaderCellStyleImpl,
  groupedHeaderChildRule as groupedHeaderChildRuleImpl,
  groupedHeaderLabelStyle as groupedHeaderLabelStyleImpl,
  type HeaderGroupCell as HeaderGroupCellType,
  headerGroupRow as headerGroupRowImpl,
  headerGroupRows as headerGroupRowsImpl,
  type HtmlGroupedHeaderCell as HtmlGroupedHeaderCellType,
  htmlGroupedHeaderPlan as htmlGroupedHeaderPlanImpl,
  isColumnGroupRenderKey as isColumnGroupRenderKeyImpl,
  isColumnGroupStubKey as isColumnGroupStubKeyImpl,
  isColumnGroupSummaryKey as isColumnGroupSummaryKeyImpl,
  toggleCollapsedColumnGroup as toggleCollapsedColumnGroupImpl,
} from "./columns/headerGroups";
import type {
  EditableCellActivateProps as EditableCellActivatePropsType,
  EditableCellButtonProps as EditableCellButtonPropsType,
  EditableCellSlots as EditableCellSlotsType,
} from "./editing/EditableCellGate";
import type {
  FilterHeaderClassNames as FilterHeaderClassNamesType,
  FilterHeaderRowProps as FilterHeaderRowPropsType,
} from "./filters/FilterHeaderRow";
import type { FullscreenState as FullscreenStateType } from "./layout/useFullscreen";
import { useFullscreen as useFullscreenImpl } from "./layout/useFullscreen";
import {
  type BodyCell as BodyCellType,
  bodyCellsHaveRowSpan as bodyCellsHaveRowSpanImpl,
  cellsForRow as cellsForRowImpl,
  cellSpanMark as cellSpanMarkImpl,
  rowSpanSignature as rowSpanSignatureImpl,
} from "./rows/cellSpan";
import {
  EXTRA_OVER_SPAN_ROW_STYLE as EXTRA_OVER_SPAN_ROW_STYLE_IMPL,
  EXTRA_OVER_SPAN_STYLE as EXTRA_OVER_SPAN_STYLE_IMPL,
  EXTRA_ROW_PARTS as EXTRA_ROW_PARTS_IMPL,
  extraCountBeforeRowIds as extraCountBeforeRowIdsImpl,
  extraCoveredTableSlots as extraCoveredTableSlotsImpl,
  type ExtraEntry as ExtraEntryType,
  extraHostFillStyle as extraHostFillStyleImpl,
  extraRowsForSection as extraRowsForSectionImpl,
  extraUncoveredColSpans as extraUncoveredColSpansImpl,
  inflateBodyCellRowSpans as inflateBodyCellRowSpansImpl,
  insertExtraRows as insertExtraRowsImpl,
  insertExtrasBeforeRows as insertExtrasBeforeRowsImpl,
  isExtraEntry as isExtraEntryImpl,
} from "./rows/extraRows";
import {
  orderedCardEntries as orderedCardEntriesImpl,
  PINNED_BOTTOM_PART as PINNED_BOTTOM_PART_IMPL,
  PINNED_TOP_PART as PINNED_TOP_PART_IMPL,
  pinnedRowCellStyle as pinnedRowCellStyleImpl,
  pinnedRowPart as pinnedRowPartImpl,
  pinnedRowSticky as pinnedRowStickyImpl,
  pinnedRowStickyStyle as pinnedRowStickyStyleImpl,
  useOffsetHeight as useOffsetHeightImpl,
} from "./rows/pinnedRowChrome";
import { rowPinSignature as rowPinSignatureImpl } from "./rows/rowPinning";
import {
  REORDER_COLUMN_WIDTH as REORDER_COLUMN_WIDTH_IMPL,
  ROW_DND_MIME as ROW_DND_MIME_IMPL,
  rowReorderDropStyle as rowReorderDropStyleImpl,
  rowReorderSignature as rowReorderSignatureImpl,
  type RowReorderState as RowReorderStateType,
} from "./rows/rowReorder";
import {
  resolveRowHeight as resolveRowHeightImpl,
  resolveRowStyle as resolveRowStyleImpl,
  rowStyleSignature as rowStyleSignatureImpl,
} from "./rows/rowStyle";
import { rowSourceIndex as rowSourceIndexImpl } from "./virtual/useTableVirtualization";

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const COLUMN_GROUP_ID_SEP = COLUMN_GROUP_ID_SEP_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const COLUMN_GROUP_RENDER_PREFIX = COLUMN_GROUP_RENDER_PREFIX_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const COLUMN_GROUP_STUB_PREFIX = COLUMN_GROUP_STUB_PREFIX_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const COLUMN_GROUP_STUB_WIDTH = COLUMN_GROUP_STUB_WIDTH_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const columnGroupHeaderCaption = columnGroupHeaderCaptionImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const columnGroupId = columnGroupIdImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const columnGroupPath = columnGroupPathImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const columnGroupStubStyle = columnGroupStubStyleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const groupedHeaderAlign = groupedHeaderAlignImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const groupedHeaderCellStyle = groupedHeaderCellStyleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const groupedHeaderChildRule = groupedHeaderChildRuleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const groupedHeaderLabelStyle = groupedHeaderLabelStyleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type HeaderGroupCell = HeaderGroupCellType;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const headerGroupRow = headerGroupRowImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const headerGroupRows = headerGroupRowsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type HtmlGroupedHeaderCell = HtmlGroupedHeaderCellType;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const htmlGroupedHeaderPlan = htmlGroupedHeaderPlanImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const isColumnGroupRenderKey = isColumnGroupRenderKeyImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const isColumnGroupStubKey = isColumnGroupStubKeyImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const isColumnGroupSummaryKey = isColumnGroupSummaryKeyImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const toggleCollapsedColumnGroup = toggleCollapsedColumnGroupImpl;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const EXTRA_OVER_SPAN_ROW_STYLE = EXTRA_OVER_SPAN_ROW_STYLE_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const EXTRA_OVER_SPAN_STYLE = EXTRA_OVER_SPAN_STYLE_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const EXTRA_ROW_PARTS = EXTRA_ROW_PARTS_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const extraCountBeforeRowIds = extraCountBeforeRowIdsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const extraCoveredTableSlots = extraCoveredTableSlotsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type ExtraEntry = ExtraEntryType;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const extraHostFillStyle = extraHostFillStyleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const extraRowsForSection = extraRowsForSectionImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const extraUncoveredColSpans = extraUncoveredColSpansImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const inflateBodyCellRowSpans = inflateBodyCellRowSpansImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const insertExtraRows = insertExtraRowsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const insertExtrasBeforeRows = insertExtrasBeforeRowsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const isExtraEntry = isExtraEntryImpl;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const orderedCardEntries = orderedCardEntriesImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const PINNED_BOTTOM_PART = PINNED_BOTTOM_PART_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const PINNED_TOP_PART = PINNED_TOP_PART_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const pinnedRowCellStyle = pinnedRowCellStyleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const pinnedRowPart = pinnedRowPartImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const pinnedRowSticky = pinnedRowStickyImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const pinnedRowStickyStyle = pinnedRowStickyStyleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const useOffsetHeight = useOffsetHeightImpl;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const columnMenuActions = columnMenuActionsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const filterColumnMenuRows = filterColumnMenuRowsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const hideAllColumns = hideAllColumnsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const resetColumnLayout = resetColumnLayoutImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const showAllColumns = showAllColumnsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const unpinAllColumns = unpinAllColumnsImpl;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type BodyCell<TRow> = BodyCellType<TRow>;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const bodyCellsHaveRowSpan = bodyCellsHaveRowSpanImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const cellsForRow = cellsForRowImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const cellSpanMark = cellSpanMarkImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const rowSpanSignature = rowSpanSignatureImpl;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const REORDER_COLUMN_WIDTH = REORDER_COLUMN_WIDTH_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const ROW_DND_MIME = ROW_DND_MIME_IMPL;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const rowReorderDropStyle = rowReorderDropStyleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const rowReorderSignature = rowReorderSignatureImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type RowReorderState<TRow> = RowReorderStateType<TRow>;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const resolveRowHeight = resolveRowHeightImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const resolveRowStyle = resolveRowStyleImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const rowStyleSignature = rowStyleSignatureImpl;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type EditableCellActivateProps = EditableCellActivatePropsType;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type EditableCellButtonProps = EditableCellButtonPropsType;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type EditableCellSlots = EditableCellSlotsType;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type FilterHeaderClassNames = FilterHeaderClassNamesType;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type FilterHeaderRowProps<TRow> = FilterHeaderRowPropsType<TRow>;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const applyCollapsedColumnGroups = applyCollapsedColumnGroupsImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const flattenColumnTree = flattenColumnTreeImpl;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export type FullscreenState = FullscreenStateType;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const useFullscreen = useFullscreenImpl;

/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const rowPinSignature = rowPinSignatureImpl;
/**
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @public
 */
export const rowSourceIndex = rowSourceIndexImpl;
