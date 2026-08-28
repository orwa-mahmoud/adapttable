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
 * Path separator inside a column-group id — labels may contain `/`.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const COLUMN_GROUP_ID_SEP = COLUMN_GROUP_ID_SEP_IMPL;
/**
 * Synthetic leaf shown when a collapsed group uses `collapsedRender`.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const COLUMN_GROUP_RENDER_PREFIX = COLUMN_GROUP_RENDER_PREFIX_IMPL;
/**
 * Synthetic leaf shown when a collapsed group has no summary column.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const COLUMN_GROUP_STUB_PREFIX = COLUMN_GROUP_STUB_PREFIX_IMPL;
/**
 * Pixel lock for a collapsed arrow stub — chevron only, no leftover strip.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const COLUMN_GROUP_STUB_WIDTH = COLUMN_GROUP_STUB_WIDTH_IMPL;
/**
 * Visible group caption; `null` when the collapsed stub hides the name.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const columnGroupHeaderCaption = columnGroupHeaderCaptionImpl;
/**
 * Stable id for a group path.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const columnGroupId = columnGroupIdImpl;
/**
 * `column.group` as a root-to-leaf path. A string is one level.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const columnGroupPath = columnGroupPathImpl;
/**
 * Size lock for a collapsed arrow-stub column. `width` alone is a hint in
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const columnGroupStubStyle = columnGroupStubStyleImpl;
/**
 * Alignment for a group header. Omit / unknown → `"center"`, so existing
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const groupedHeaderAlign = groupedHeaderAlignImpl;
/**
 * Style on one HTML group header cell: inset hairline while children sit
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const groupedHeaderCellStyle = groupedHeaderCellStyleImpl;
/**
 * Inset hairline under a group title that still has child headers below.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const groupedHeaderChildRule = groupedHeaderChildRuleImpl;
/**
 * Cluster for the collapse chevron + group title. A one-child group is only
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const groupedHeaderLabelStyle = groupedHeaderLabelStyleImpl;
/**
 * One cell of a group header row.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type HeaderGroupCell = HeaderGroupCellType;
/**
 * The top group-header row. `null` when no visible column declares a group.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const headerGroupRow = headerGroupRowImpl;
/**
 * Every group-header row, top level first. Returns `null` when no visible
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const headerGroupRows = headerGroupRowsImpl;
/**
 * One cell in {@link htmlGroupedHeaderPlan}. Group cells span children
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type HtmlGroupedHeaderCell = HtmlGroupedHeaderCellType;
/**
 * Header rows for HTML-table kits. `null` when no column declares a group.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const htmlGroupedHeaderPlan = htmlGroupedHeaderPlanImpl;
/**
 * True when this key is a collapsed-group `collapsedRender` column.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const isColumnGroupRenderKey = isColumnGroupRenderKeyImpl;
/**
 * True when this key is a collapsed-group arrow stub.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const isColumnGroupStubKey = isColumnGroupStubKeyImpl;
/**
 * True when this key is a stub or `collapsedRender` summary leaf.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const isColumnGroupSummaryKey = isColumnGroupSummaryKeyImpl;
/**
 * Add or drop a group id in the collapsed set.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const toggleCollapsedColumnGroup = toggleCollapsedColumnGroupImpl;

/**
 * Lift an extra row above a continuing Team span so the note is not hidden
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const EXTRA_OVER_SPAN_ROW_STYLE = EXTRA_OVER_SPAN_ROW_STYLE_IMPL;
/**
 * Cell paint for an extra: RTL-safe align, and room for a line of text.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const EXTRA_OVER_SPAN_STYLE = EXTRA_OVER_SPAN_STYLE_IMPL;
/**
 * Part names every kit stamps on an extra row.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const EXTRA_ROW_PARTS = EXTRA_ROW_PARTS_IMPL;
/**
 * How many extras sit immediately in front of any of these data-row ids.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const extraCountBeforeRowIds = extraCountBeforeRowIdsImpl;
/**
 * Table-slot indexes (leading chrome + data columns) a continuing row span
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const extraCoveredTableSlots = extraCoveredTableSlotsImpl;
/**
 * A separator or full-width entry in a `kind`-tagged body list.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type ExtraEntry = ExtraEntryType;
/**
 * The fill the host already passed for this extra's person. Height is not
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const extraHostFillStyle = extraHostFillStyleImpl;
/**
 * Extras whose `beforeRowId` sits in this section. Untargeted extras
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const extraRowsForSection = extraRowsForSectionImpl;
/**
 * Uncovered colSpans for an extra row that has to leave holes for a row span.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const extraUncoveredColSpans = extraUncoveredColSpansImpl;
/**
 * Grow a data-row `rowSpan` so it still reaches the last covered person
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const inflateBodyCellRowSpans = inflateBodyCellRowSpansImpl;
/**
 * Splice extras into a `kind`-tagged list. `dataKey` names the data row
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const insertExtraRows = insertExtraRowsImpl;
/**
 * Splice extras whose `beforeRowId` is in this row list. Use on a pin
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const insertExtrasBeforeRows = insertExtrasBeforeRowsImpl;
/**
 * Narrow a body slot to a host-injected extra.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const isExtraEntry = isExtraEntryImpl;

/**
 * Card list order: top pins, then the scroll window, then bottom pins.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const orderedCardEntries = orderedCardEntriesImpl;
/**
 * Bottom pin marker on that row.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const PINNED_BOTTOM_PART = PINNED_BOTTOM_PART_IMPL;
/**
 * `data-adapttable-part` on a pinned row in the shared tbody.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const PINNED_TOP_PART = PINNED_TOP_PART_IMPL;
/**
 * Extra sticky inset a cell in a pinned row needs, and the z-index when
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const pinnedRowCellStyle = pinnedRowCellStyleImpl;
/**
 * Part name for a pinned row, or `undefined` when the row is not pinned.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const pinnedRowPart = pinnedRowPartImpl;
/**
 * Sticky style when the row is pinned and the kit asked for sticky pins.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const pinnedRowSticky = pinnedRowStickyImpl;
/**
 * Sticky style for a pinned-row section (tbody or the row itself).
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const pinnedRowStickyStyle = pinnedRowStickyStyleImpl;
/**
 * Measure an element's offset height; used for the sticky header offset.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const useOffsetHeight = useOffsetHeightImpl;

/**
 * Sort, pin, hide, autosize, filter, reset — disabled when locked.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const columnMenuActions = columnMenuActionsImpl;
/**
 * Keep rows whose name or key contains the query (case-insensitive).
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const filterColumnMenuRows = filterColumnMenuRowsImpl;
/**
 * Hide every unlocked visible column.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const hideAllColumns = hideAllColumnsImpl;
/**
 * Restore one column's visibility, pin and width. Locks still apply.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const resetColumnLayout = resetColumnLayoutImpl;
/**
 * Show every unlocked hidden column.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const showAllColumns = showAllColumnsImpl;
/**
 * Unpin every unlocked pinned column.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const unpinAllColumns = unpinAllColumnsImpl;

/**
 * One body cell a kit renders — covered cells never appear.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type BodyCell<TRow> = BodyCellType<TRow>;
/**
 * True when any origin cell is taller than one row.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const bodyCellsHaveRowSpan = bodyCellsHaveRowSpanImpl;
/**
 * Look up a row's cells; empty when the row is unknown.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const cellsForRow = cellsForRowImpl;
/**
 * `"2x1"` when this cell owns more than one slot; otherwise nothing.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const cellSpanMark = cellSpanMarkImpl;
/**
 * Memo digest so a virtualized row repaints when its spans change.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const rowSpanSignature = rowSpanSignatureImpl;

/**
 * Width (px) of the injected reorder column — shared so pin leads agree.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const REORDER_COLUMN_WIDTH = REORDER_COLUMN_WIDTH_IMPL;
/**
 * MIME type carrying the dragged row id during a reorder drag.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const ROW_DND_MIME = ROW_DND_MIME_IMPL;
/**
 * Dim the lifted row and draw an insertion line on the drop target.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const rowReorderDropStyle = rowReorderDropStyleImpl;
/**
 * Per-row digest so a memoized row repaints when IT is lifted or is the drop
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const rowReorderSignature = rowReorderSignatureImpl;
/**
 * Row-reorder state: what is being dragged and where it may land.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type RowReorderState<TRow> = RowReorderStateType<TRow>;

/**
 * Resolve `rowHeight` for one row.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const resolveRowHeight = resolveRowHeightImpl;
/**
 * Merge `rowStyle` with an explicit height. Height wins when both name it —
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const resolveRowStyle = resolveRowStyleImpl;
/**
 * Stable compare key for a memoized row's resolved style.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const rowStyleSignature = rowStyleSignatureImpl;

/**
 * Kit activate control the gate calls while the cell is idle.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type EditableCellActivateProps = EditableCellActivatePropsType;
/**
 * Kit button the gate calls for a conflict choice.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type EditableCellButtonProps = EditableCellButtonPropsType;
/**
 * Adapter-supplied controls for `EditableCellGate`.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type EditableCellSlots = EditableCellSlotsType;

/**
 * Per-part classes for the filter header row.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type FilterHeaderClassNames = FilterHeaderClassNamesType;
/**
 * Props for the filter row under the column headers.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type FilterHeaderRowProps<TRow> = FilterHeaderRowPropsType<TRow>;

/**
 * Hide leaves under collapsed groups according to each parent's options.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const applyCollapsedColumnGroups = applyCollapsedColumnGroupsImpl;
/**
 * Flatten a mixed column tree into leaves. Tree parents become `group`
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const flattenColumnTree = flattenColumnTreeImpl;

/**
 * What `useFullscreen` returns.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export type FullscreenState = FullscreenStateType;
/**
 * Promote a table to fullscreen, and say where overlays should go.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const useFullscreen = useFullscreenImpl;

/**
 * Memo digest so a virtualized row repaints when it is pinned or unpinned.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const rowPinSignature = rowPinSignatureImpl;
/**
 * Dataset index for ARIA and focus — the window index when pinning is off.
 *
 * @deprecated Import from "@adapttable/core/adapter". Removed from the main entry at v3.
 *
 * @internal
 */
export const rowSourceIndex = rowSourceIndexImpl;
