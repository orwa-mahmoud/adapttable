import { createElement } from "react";

import { extendFeature, slotRender } from "../features/providers";
import {
  nestedTable as coreNestedTable,
  rowDetail as coreRowDetail,
} from "../features/row-detail";
import {
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
} from "../features/slotKeys";
import type { TableFeature } from "../features/tableFeature";
import type { NestedTableFor } from "../tree/nestedTable";
import type { AdapterFeatureComponent } from "./component";

/**
 * Kit renderer for row and nested-table expansion.
 *
 * @public
 */
export interface AdapterRowDetailComponents {
  /** Expand/collapse control shown beside expandable rows. */
  readonly ExpandToggle: AdapterFeatureComponent<ExpandToggleSlotProps>;
}

/**
 * Row-detail factories bound to one kit's expansion control.
 *
 * @public
 */
export interface AdapterRowDetailFeatures {
  /** Render a panel under an expanded row. */
  readonly rowDetail: <TRow>(
    renderRowDetail: (row: TRow) => unknown,
    defaultExpandedRowIds?: readonly string[]
  ) => TableFeature<TRow>;
  /** Render a whole table inside an expanded row. */
  readonly nestedTable: <TRow>(
    nested: NestedTableFor<TRow>,
    defaultExpandedRowIds?: readonly string[]
  ) => TableFeature<TRow>;
}

/**
 * Bind core's expansion lifecycle to one kit's expand control.
 *
 * @public
 */
export function createAdapterRowDetailFeatures(
  components: AdapterRowDetailComponents
): AdapterRowDetailFeatures {
  const renders = [
    slotRender(EXPAND_TOGGLE, (props) =>
      createElement(components.ExpandToggle, props)
    ),
  ];

  function rowDetail<TRow>(
    renderRowDetail: (row: TRow) => unknown,
    defaultExpandedRowIds?: readonly string[]
  ): TableFeature<TRow> {
    return extendFeature(
      coreRowDetail(renderRowDetail, defaultExpandedRowIds),
      renders
    );
  }

  function nestedTable<TRow>(
    nested: NestedTableFor<TRow>,
    defaultExpandedRowIds?: readonly string[]
  ): TableFeature<TRow> {
    return extendFeature(
      coreNestedTable(nested, defaultExpandedRowIds),
      renders
    );
  }

  return { rowDetail, nestedTable };
}
