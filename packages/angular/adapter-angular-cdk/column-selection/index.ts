/**
 * Column selection — `@adapttable/angular-cdk/column-selection`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  COLUMN_SELECT,
  columnSelectionCheckbox as bindingColumnSelectionCheckbox,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { AdaptColumnSelectCheckbox } from "@adapttable/angular-cdk";

/**
 * A native checkbox in each column header that selects the whole column —
 * the selection Ctrl/Cmd+click on a header makes, reachable by touch and by
 * a screen reader. Needs the keyboard grid (`cellNavigation()`).
 *
 * @returns The feature.
 *
 * @public
 */
export function columnSelectionCheckbox(): AdaptTableFeature {
  return extendFeature(bindingColumnSelectionCheckbox(), [
    slotRender(COLUMN_SELECT, () => AdaptColumnSelectCheckbox),
  ]);
}
