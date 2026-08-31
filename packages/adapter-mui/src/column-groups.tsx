import {
  COLUMN_GROUP_TOGGLE,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { collapsibleColumnGroups as core } from "@adapttable/core/features";

import { ColumnGroupToggle } from "./components/kitControls";

/**
 * Collapse a header group, with MUI's own chevron.
 *
 * @public
 */
export function collapsibleColumnGroups<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_GROUP_TOGGLE, (props) => (
      <ColumnGroupToggle {...props} />
    )),
  ]);
}
