import {
  COLUMN_HEADER_RENAME,
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import { columnMenu as core } from "@adapttable/core/features";

import { ColumnHeaderRename } from "./components/ColumnHeaderRename";
import { ColumnMenu } from "./components/ColumnMenu";

function ColumnMenuSlot(props: Readonly<ColumnMenuSlotProps<never>>) {
  return <ColumnMenu {...props} />;
}

/**
 * The Columns menu, drawn with Ant Design's own button and popover.
 *
 * Concatenate onto the core live render — replacing `renders` would drop
 * `COLUMN_LAYOUT_LIVE`.
 *
 * @public
 */
export function columnMenu(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(COLUMN_MENU, (props) => <ColumnMenuSlot {...props} />),
    slotRender(COLUMN_HEADER_RENAME, (props) => (
      <ColumnHeaderRename {...props} />
    )),
  ]);
}
