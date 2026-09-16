import {
  createAdapterRowDetailFeatures,
  type ExpandToggleSlotProps,
} from "@adapttable/react/adapter";

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

const rowDetailFeatures = createAdapterRowDetailFeatures({
  ExpandToggle: ExpandSlot,
});

/** Render a panel under an expanded row. @public */
export const rowDetail = rowDetailFeatures.rowDetail;
/** Render a whole table inside an expanded row. @public */
export const nestedTable = rowDetailFeatures.nestedTable;
