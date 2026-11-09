/** The code `editHistory()` brings to the table. */
import { asBatchGesture } from "@adapttable/core/editing";

import type { EditHistoryImplementation } from "../featureImplementations";
import { injectTableEditHistory } from "./editHistory";

/**
 * Edit history's undo stack and batch recording, filed by `editHistory()`.
 *
 * @public
 */
export const EDIT_HISTORY_IMPLEMENTATION: EditHistoryImplementation = {
  inject: injectTableEditHistory,
  batchGesture: asBatchGesture,
};
