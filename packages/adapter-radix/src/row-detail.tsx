import {
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  nestedTable as coreNested,
  type NestedTableFor,
  rowDetail as coreDetail,
} from "@adapttable/core/features";

import { ExpandToggle } from "./components/ExpandToggle";

function ExpandSlot(props: Readonly<ExpandToggleSlotProps>) {
  return (
    <ExpandToggle
      open={props.expanded}
      dir={props.dir}
      labels={{
        expandRow: props.expandLabel,
        collapseRow: props.collapseLabel,
      }}
      onToggle={() => props.onToggle(props.id)}
    />
  );
}

const expandChrome = [
  slotRender(EXPAND_TOGGLE, (props) => <ExpandSlot {...props} />),
];

/**
 * Render a panel under an expanded row.
 *
 * @public
 */
export function rowDetail<TRow>(
  renderRowDetail: (row: TRow) => unknown,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return extendFeature(
    coreDetail(renderRowDetail, defaultExpandedRowIds),
    expandChrome
  );
}

/**
 * Render a whole table inside a row's detail panel.
 *
 * @public
 */
export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return extendFeature(coreNested(nested, defaultExpandedRowIds), expandChrome);
}
