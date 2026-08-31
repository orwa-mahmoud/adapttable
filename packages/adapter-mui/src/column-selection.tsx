import {
  COLUMN_SELECT,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { columnSelectionCheckbox as core } from "@adapttable/core/features";

import { ColumnSelectCheckbox } from "./components/ColumnSelectCheckbox";

/**
 * A header checkbox that selects a whole column, drawn with MUI's Checkbox.
 *
 * @public
 */
export function columnSelectionCheckbox<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_SELECT, (props) => <ColumnSelectCheckbox {...props} />),
  ]);
}
