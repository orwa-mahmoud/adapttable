import { densityChooser } from "@adapttable/vue-unstyled/density";
import { fullscreen } from "@adapttable/vue-unstyled/fullscreen";
import {
  savedViews,
  type SavedViewsPanelProps,
} from "@adapttable/vue-unstyled/saved-views";

densityChooser({ density: "compact" });
fullscreen({ fallback: true });
savedViews({ storageKey: 42 });
savedViews({ storageKey: "views", storage: { getItem: () => 12 } });
export const invalidPanel: SavedViewsPanelProps = { views: [] };
