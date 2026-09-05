import { createAdapterRowDetailFeatures } from "@adapttable/react/adapter";

import { ExpandToggle } from "./components/ExpandToggle";

const rowDetailFeatures = createAdapterRowDetailFeatures({
  ExpandToggle: ExpandToggle,
});

/** Render a panel under an expanded row. @public */
export const rowDetail = rowDetailFeatures.rowDetail;
/** Render a whole table inside an expanded row. @public */
export const nestedTable = rowDetailFeatures.nestedTable;
