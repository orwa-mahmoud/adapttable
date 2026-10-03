/**
 * Interactive grouping strip — `@adapttable/ngx-bootstrap/grouping-panel`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  GROUPING_PANEL,
  groupingPanel as coreAngularGroupingPanel,
  type GroupingPanelExtras,
  slotRender,
} from "@adapttable/angular";
import {
  AdaptGroupHeaderCard,
  AdaptGroupHeaderRow,
  AdaptGroupingPanel,
} from "@adapttable/ngx-bootstrap";

/**
 * The interactive grouping strip: chips, carets, aggregations and the
 * ungroup target, drawn with native controls. The panel owns the group-by
 * state and groups the rows under the same headers `grouping()` draws.
 *
 * @param groupBy - Initial grouping keys; a URL that already carries one keeps it.
 * @param extras - Aggregates, footers, paging, sorting and collapse state.
 *
 * @public
 */
export function groupingPanel<TRow = unknown>(
  groupBy?: string | readonly string[],
  extras: GroupingPanelExtras<TRow> = {}
): AdaptTableFeature {
  return extendFeature(coreAngularGroupingPanel(groupBy, extras), [
    slotRender(GROUPING_PANEL, () => AdaptGroupingPanel),
    slotRender(GROUP_HEADER_ROW, () => AdaptGroupHeaderRow),
    slotRender(GROUP_HEADER_CARD, () => AdaptGroupHeaderCard),
  ]);
}
