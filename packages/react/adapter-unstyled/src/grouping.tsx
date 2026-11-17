import { createAdapterGroupingFeature } from "@adapttable/react/adapter";

import { GroupHeaderCard, GroupHeaderRow } from "./components/GroupHeader";

/** Group rows under collapsible native-control headers. @public */
export const grouping = createAdapterGroupingFeature({
  GroupHeaderRow,
  GroupHeaderCard,
});

export type { GroupSort } from "@adapttable/react/features";
