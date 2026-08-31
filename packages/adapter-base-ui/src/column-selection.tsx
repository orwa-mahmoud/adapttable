import {
  COLUMN_SELECT,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { columnSelectionCheckbox as core } from "@adapttable/core/features";

import { ColumnSelectCheckbox } from "./components/ColumnSelectCheckbox";

export function columnSelectionCheckbox<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_SELECT, (props) => <ColumnSelectCheckbox {...props} />),
  ]);
}
