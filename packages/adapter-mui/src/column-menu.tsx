import {
  COLUMN_MENU,
  extendFeature,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { columnMenu as core } from "@adapttable/core/features";

import { ColumnMenu } from "./components/ColumnMenu";

/**
 * The Columns menu, drawn with MUI's own button and popover.
 *
 * Concatenate onto the core live render — replacing `renders` would drop
 * {@link COLUMN_LAYOUT_LIVE}.
 *
 * @public
 */
export function columnMenu<TRow>(): TableFeature<TRow> {
  return extendFeature(core<TRow>(), [
    slotRender(COLUMN_MENU, (props) => <ColumnMenu {...props} />),
  ]);
}
