import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import { densityChooser as core } from "@adapttable/core/features";

import { DensityButton } from "./components/toolbarExtras";

/**
 * Switch row density, with Radix Themes's own toolbar control.
 *
 * @public
 */
export function densityChooser(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(TOOLBAR_EXTRAS, (props) => <DensityButton {...props} />),
  ]);
}
