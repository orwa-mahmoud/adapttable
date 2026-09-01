import {
  extendFeature,
  FIND_BAR,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { findInTable as core } from "@adapttable/core/features";

import { FindBar } from "./components/kitControls";

export function findInTable(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(FIND_BAR, (props) => <FindBar {...props} />),
  ]);
}
