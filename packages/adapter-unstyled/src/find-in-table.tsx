import {
  extendFeature,
  FIND_BAR,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { findInTable as core } from "@adapttable/core/features";

import { FindBar } from "./components/kitControls";

export function findInTable<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(FIND_BAR, (props) => <FindBar {...props} />),
  ]);
}
