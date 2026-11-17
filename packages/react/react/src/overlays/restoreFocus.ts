export { restoreFocusSoon } from "@adapttable/core/binding";
/**
 * Hand focus back to the control an overlay was opened from. The timing rule
 * — focus on the next frame, then reclaim once if a kit dropped it — lives in
 * core.
 */
