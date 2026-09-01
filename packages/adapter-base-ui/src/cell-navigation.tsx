import {
  extendFeature,
  FILL_HANDLE,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { cellNavigation as core } from "@adapttable/core/features";

import { FillHandle } from "./components/FillHandle";

/**
 * Keyboard grid plus the fill handle, drawn with Base UI's own control.
 *
 * @public
 */
export function cellNavigation(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FILL_HANDLE, (props) => <FillHandle {...props} />),
  ]);
}
