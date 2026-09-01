import {
  extendFeature,
  slotRender,
  type TableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import { densityChooser as core } from "@adapttable/core/features";

import { DensityButton } from "./components/toolbarExtras";

/**
 * Switch row density, with Base UI's own toolbar control.
 *
 * @public
 */
export function densityChooser<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(TOOLBAR_EXTRAS, (props) => <DensityButton {...props} />),
  ]);
}
