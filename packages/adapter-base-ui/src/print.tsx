import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import { print as core } from "@adapttable/core/features";

import { PrintButton } from "./components/toolbarExtras";

/**
 * A print action, with Base UI's own toolbar button.
 *
 * @public
 */
export function print(
  onPrint: () => void,
  printButton = false
): StaticTableFeature {
  return extendFeature(core(onPrint, printButton), [
    slotRender(TOOLBAR_EXTRAS, (props) => <PrintButton {...props} />),
  ]);
}
