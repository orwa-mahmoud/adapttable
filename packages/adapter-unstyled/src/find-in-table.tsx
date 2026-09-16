import {
  extendFeature,
  FIND_BAR,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import { findInTable as core } from "@adapttable/react/features";

import { FindBar } from "./components/kitControls";

/**
 * Find-as-you-type over the rendered rows, with native controls input and buttons.
 *
 * @public
 */
export function findInTable(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FIND_BAR, (props) => <FindBar {...props} />),
  ]);
}
