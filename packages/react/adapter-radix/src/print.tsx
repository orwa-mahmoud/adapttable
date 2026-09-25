import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/react/adapter";
import { print as core } from "@adapttable/react/features";

import { PrintButton } from "./components/toolbarExtras";

/**
 * A print action, with Radix Themes's own toolbar button.
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
