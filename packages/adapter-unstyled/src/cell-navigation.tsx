import {
  extendFeature,
  FILL_HANDLE,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import { cellNavigation as core } from "@adapttable/react/features";

import { FillHandle } from "./components/FillHandle";

/**
 * Keyboard grid plus the fill handle, drawn with native controls control.
 *
 * @public
 */
export function cellNavigation(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FILL_HANDLE, (props) => <FillHandle {...props} />),
  ]);
}
