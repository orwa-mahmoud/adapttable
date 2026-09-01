import type { TableLabels } from "@adapttable/core";
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

import { useClassNames } from "./components/classNamesContext";
import { ExpandButton } from "./components/ExpandToggle";

function ExpandSlot(props: Readonly<ExpandToggleSlotProps>) {
  const classNames = useClassNames();
  return (
    <ExpandButton
      expanded={props.expanded}
      classNames={classNames}
      labels={
        {
          expandRow: props.expandLabel,
          collapseRow: props.collapseLabel,
        } as Required<TableLabels>
      }
      onToggle={() => props.onToggle(props.id)}
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
  nested: NestedTableFor<TRow>,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return extendFeature(coreNested(nested, defaultExpandedRowIds), expandChrome);
}
