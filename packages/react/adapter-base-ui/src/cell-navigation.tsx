import {
  extendFeature,
  FILL_HANDLE,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import {
  cellNavigation as core,
  type CellNavigationOptions,
} from "@adapttable/react/features";

import { FillHandle } from "./components/FillHandle";

/**
 * Keyboard grid plus the fill handle, drawn with Base UI's own control.
 *
 * @public
 */
export function cellNavigation(
  options: CellNavigationOptions = {}
): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(FILL_HANDLE, (props) => <FillHandle {...props} />),
  ]);
}

export type { CellNavigationOptions } from "@adapttable/react/features";
