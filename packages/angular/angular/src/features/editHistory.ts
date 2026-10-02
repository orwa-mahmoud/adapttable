/** Edit history is opt-in and uses core's feature configuration. */
import { coreEditHistory } from "@adapttable/core/binding";

import type { EditHistoryOptions } from "../editing/editHistory";
import type { AdaptTableFeature } from "../featureHost";

/** Record cell and batch-edit gestures for undo and redo. @public */
export function editHistory(
  options: boolean | EditHistoryOptions = true
): AdaptTableFeature {
  return coreEditHistory(options);
}
