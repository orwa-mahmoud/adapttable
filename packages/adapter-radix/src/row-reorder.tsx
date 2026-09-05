import { createAdapterRowReorderFeature } from "@adapttable/react/adapter";

import { RowReorderButtons, RowReorderHandle } from "./components/kitControls";

const rowReorderFeature = createAdapterRowReorderFeature({
  RowReorderHandle,
  RowReorderButtons,
});

/** Let rows be dragged or moved with the keyboard. @public */
export const rowReorder = rowReorderFeature;
