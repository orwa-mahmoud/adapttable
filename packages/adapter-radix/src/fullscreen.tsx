import {
  extendFeature,
  slotRender,
  type TableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import { fullscreen as core } from "@adapttable/core/features";

import { FullscreenButton } from "./components/toolbarExtras";

/**
 * Take the table fullscreen, with Radix Themes's own toolbar toggle.
 *
 * @public
 */
export function fullscreen<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(TOOLBAR_EXTRAS, (props) => <FullscreenButton {...props} />),
  ]);
}
