import {
  COLUMN_GROUP_TOGGLE,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import { collapsibleColumnGroups as core } from "@adapttable/react/features";

import { ColumnGroupToggle } from "./components/kitControls";

/**
 * Collapse a header group, with Radix UI's own chevron.
 *
 * @public
 */
export function collapsibleColumnGroups(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(COLUMN_GROUP_TOGGLE, (props) => (
      <ColumnGroupToggle {...props} />
    )),
  ]);
}
