import {
  COLUMN_SELECT,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import { columnSelectionCheckbox as core } from "@adapttable/react/features";

import { ColumnSelectCheckbox } from "./components/ColumnSelectCheckbox";

/**
 * A header checkbox that selects a whole column, drawn with MUI's Checkbox.
 *
 * @public
 */
export function columnSelectionCheckbox(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(COLUMN_SELECT, (props) => <ColumnSelectCheckbox {...props} />),
  ]);
}
