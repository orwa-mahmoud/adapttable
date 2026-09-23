import {
  extendFeature,
  FIND_BAR,
  findButtonRender,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import { findInTable as core } from "@adapttable/react/features";

import { FindBar } from "./components/kitControls";
import { FindButton } from "./components/toolbarExtras";

/**
 * Find-as-you-type over the rendered rows, with native controls input and buttons.
 *
 * `button: true` also draws a Find control among the toolbar's view controls.
 *
 * @public
 */
export function findInTable(
  options: { readonly button?: boolean } = {}
): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FIND_BAR, (props) => <FindBar {...props} />),
    ...(options.button === true ? [findButtonRender(FindButton)] : []),
  ]);
}
