import type { GroupingPanelInteractions } from "@adapttable/core";

import { featureStateKey } from "./providers";

/** Provider-state key for the optional grouping panel. @public */
export const GROUPING_PANEL_STATE =
  featureStateKey<GroupingPanelInteractions>("grouping-panel");
