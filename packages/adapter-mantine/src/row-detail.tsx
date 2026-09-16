import {
  createAdapterRowDetailFeatures,
  type ExpandToggleSlotProps,
} from "@adapttable/react/adapter";

import { ExpandToggle } from "./components/ExpandToggle";

function ExpandSlot(props: Readonly<ExpandToggleSlotProps>) {
  return (
    <ExpandToggle
      expanded={props.expanded}
      expandLabel={props.expandLabel}
      collapseLabel={props.collapseLabel}
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
