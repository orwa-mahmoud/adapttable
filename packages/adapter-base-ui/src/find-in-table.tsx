import {
  extendFeature,
  FIND_BAR,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { findInTable as core } from "@adapttable/core/features";

import { FindBar } from "./components/kitControls";

/**
 * Find-as-you-type over the rendered rows, with Base UI's own input and buttons.
 *
 * @public
 */
export function findInTable(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FIND_BAR, (props) => <FindBar {...props} />),
  ]);
}
