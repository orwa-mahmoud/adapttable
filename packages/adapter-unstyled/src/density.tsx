import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/react/adapter";
import { densityChooser as core } from "@adapttable/react/features";

import { DensityButton } from "./components/toolbarExtras";

/**
 * Switch row density, with the unstyled kit's own toolbar control.
 *
 * @public
 */
export function densityChooser(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(TOOLBAR_EXTRAS, (props) => <DensityButton {...props} />),
  ]);
}
