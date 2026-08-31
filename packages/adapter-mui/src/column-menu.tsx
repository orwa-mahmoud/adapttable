import {
  COLUMN_MENU,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { columnMenu as core } from "@adapttable/core/features";

import { ColumnMenu } from "./components/ColumnMenu";

/**
 * The Columns menu, drawn with MUI's own button and popover.
 *
 * @public
 */
export function columnMenu<TRow>(): TableFeature<TRow> {
  return {
    ...core<TRow>(),
    renders: [slotRender(COLUMN_MENU, (props) => <ColumnMenu {...props} />)],
  };
}
