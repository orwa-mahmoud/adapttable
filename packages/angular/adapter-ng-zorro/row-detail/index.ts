/**
 * Row detail and nested tables — `@adapttable/ng-zorro/row-detail`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  type NestedTableFor,
  type Renderer,
  type RowDetailContext,
  slotRender,
} from "@adapttable/angular";
import { EXPAND_TOGGLE } from "@adapttable/angular/adapter";
import {
  nestedTable as bindingNestedTable,
  rowDetail as bindingRowDetail,
} from "@adapttable/angular/features";
import { AdaptExpandToggle } from "@adapttable/ng-zorro";

export type {
  NestedTable,
  NestedTableContext,
  NestedTableDefaults,
  NestedTableFor,
  RowDetailContext,
} from "@adapttable/angular";

const EXPAND = [slotRender(EXPAND_TOGGLE, () => AdaptExpandToggle)];

/**
 * Render a panel under an expanded row, opened with a native chevron in the
 * row's leading cell on desktop and on each phone card.
 *
 * ```ts
 * features: [rowDetail(detailTemplate)]
 * ```
 *
 * @param renderRowDetail - An `ng-template` or standalone component, handed
 *   the row.
 * @param defaultExpandedRowIds - Rows whose panel starts open.
 * @returns The feature.
 *
 * @public
 */
export function rowDetail<TRow>(
  renderRowDetail: Renderer<RowDetailContext<TRow>>,
  defaultExpandedRowIds?: readonly string[]
): AdaptTableFeature {
  return extendFeature(
    bindingRowDetail(renderRowDetail, defaultExpandedRowIds),
    EXPAND
  );
}

/**
 * Render this kit's own table inside a row's detail panel, in a region named
 * for assistive technology.
 *
 * @param nested - The nested table for a row, or nothing for a row without.
 * @param defaultExpandedRowIds - Rows whose panel starts open.
 * @returns The feature.
 *
 * @public
 */
export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>,
  defaultExpandedRowIds?: readonly string[]
): AdaptTableFeature {
  return extendFeature(
    bindingNestedTable(nested, defaultExpandedRowIds),
    EXPAND
  );
}
