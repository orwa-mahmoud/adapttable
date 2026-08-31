import {
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { columnMenu as core } from "@adapttable/core/features";

import { ColumnMenu } from "./components/ColumnMenu";

function ColumnMenuSlot(props: ColumnMenuSlotProps<never>) {
  return <ColumnMenu {...props} />;
}

export function columnMenu<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_MENU, (props) => <ColumnMenuSlot {...props} />),
  ]);
}
