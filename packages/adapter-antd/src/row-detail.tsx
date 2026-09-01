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
      expanded={props.expanded}
      labels={{
        expandRow: props.expandLabel,
        collapseRow: props.collapseLabel,
      }}
      onClick={() => props.onToggle(props.id)}
    />
  );
}

const expandChrome = [
  slotRender(EXPAND_TOGGLE, (props) => <ExpandSlot {...props} />),
];

export function rowDetail<TRow>(
  renderRowDetail: (row: TRow) => unknown,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return extendFeature(
    coreDetail(renderRowDetail, defaultExpandedRowIds),
    expandChrome
  );
}

export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>
): TableFeature<TRow> {
  return extendFeature(coreNested(nested), expandChrome);
}
