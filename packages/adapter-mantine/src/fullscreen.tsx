import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import { fullscreen as core } from "@adapttable/core/features";

import { FullscreenButton } from "./components/toolbarExtras";

/**
 * Take the table fullscreen, with Mantine's own toolbar toggle.
 *
 * @public
 */
export function fullscreen(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(TOOLBAR_EXTRAS, (props) => <FullscreenButton {...props} />),
  ]);
}
