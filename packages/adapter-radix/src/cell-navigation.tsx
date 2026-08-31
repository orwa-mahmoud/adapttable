import {
  extendFeature,
  FILL_HANDLE,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { cellNavigation as core } from "@adapttable/core/features";

import { FillHandle } from "./components/FillHandle";

export function cellNavigation<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(FILL_HANDLE, (props) => <FillHandle {...props} />),
  ]);
}
