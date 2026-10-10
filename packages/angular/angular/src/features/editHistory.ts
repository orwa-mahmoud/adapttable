/** Edit history is opt-in and uses core's feature configuration. */
import {
  type AdaptTableFeature,
  type EditHistoryOptions,
} from "@adapttable/angular";
import { coreEditHistory } from "@adapttable/core/binding";

/** Record cell and batch-edit gestures for undo and redo. @public */
export function editHistory(
  options: boolean | EditHistoryOptions = true
): AdaptTableFeature {
  return coreEditHistory(options);
}
