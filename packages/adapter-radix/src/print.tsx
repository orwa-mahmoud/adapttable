import {
  extendFeature,
  slotRender,
  type TableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import { print as core } from "@adapttable/core/features";

import { PrintButton } from "./components/toolbarExtras";

/**
 * A print action, with Radix Themes's own toolbar button.
 *
 * @public
 */
export function print<TRow>(
  onPrint: () => void,
  printButton = false
): TableFeature<TRow> {
  return extendFeature(core(onPrint, printButton), [
    slotRender(TOOLBAR_EXTRAS, (props) => <PrintButton {...props} />),
  ]);
}
