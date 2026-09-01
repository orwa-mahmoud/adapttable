import {
  COLUMN_SELECT,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { columnSelectionCheckbox as core } from "@adapttable/core/features";

import { ColumnSelectCheckbox } from "./components/ColumnSelectCheckbox";

export function columnSelectionCheckbox(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(COLUMN_SELECT, (props) => <ColumnSelectCheckbox {...props} />),
  ]);
}
