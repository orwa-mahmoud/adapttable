import {
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { columnMenu as core } from "@adapttable/core/features";

import { useClassNames } from "./components/classNamesContext";
import { ColumnMenu } from "./components/ColumnMenu";

function ColumnMenuSlot(props: Readonly<ColumnMenuSlotProps<never>>) {
  const classNames = useClassNames();
  return <ColumnMenu {...props} classNames={classNames} />;
}

export function columnMenu(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(COLUMN_MENU, (props) => <ColumnMenuSlot {...props} />),
  ]);
}
