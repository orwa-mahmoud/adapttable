import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/react/adapter";
import { fullscreen as core } from "@adapttable/react/features";

import { FullscreenButton } from "./components/toolbarExtras";

/**
 * Take the table fullscreen, with the unstyled kit's own toolbar toggle.
 *
 * @public
 */
export function fullscreen(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(TOOLBAR_EXTRAS, (props) => <FullscreenButton {...props} />),
  ]);
}
