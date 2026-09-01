import {
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { columnMenu as core } from "@adapttable/core/features";

import { ColumnMenu } from "./components/ColumnMenu";

function ColumnMenuSlot(props: Readonly<ColumnMenuSlotProps<never>>) {
  return <ColumnMenu {...props} />;
}

export function columnMenu(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(COLUMN_MENU, (props) => <ColumnMenuSlot {...props} />),
  ]);
}
