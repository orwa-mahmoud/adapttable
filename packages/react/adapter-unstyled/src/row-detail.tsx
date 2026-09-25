import type { TableLabels } from "@adapttable/core";
import {
  createAdapterRowDetailFeatures,
  type ExpandToggleSlotProps,
} from "@adapttable/react/adapter";

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

const rowDetailFeatures = createAdapterRowDetailFeatures({
  ExpandToggle: ExpandSlot,
});

/** Render a panel under an expanded row. @public */
export const rowDetail = rowDetailFeatures.rowDetail;
/** Render a whole table inside an expanded row. @public */
export const nestedTable = rowDetailFeatures.nestedTable;
