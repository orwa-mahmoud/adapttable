import {
  extendFeature,
  ROW_REORDER_ANNOUNCER,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
  RowReorderAnnouncer,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import { rowReorder as core } from "@adapttable/core/features";

import { RowReorderButtons, RowReorderHandle } from "./components/kitControls";

export function rowReorder<TRow>(
  onRowReorder: Parameters<typeof core<TRow>>[0]
): TableFeature<TRow> {
  return extendFeature(core(onRowReorder), [
    slotRender(ROW_REORDER_HANDLE, (props) => <RowReorderHandle {...props} />),
    slotRender(ROW_REORDER_BUTTONS, (props) => (
      <RowReorderButtons {...props} />
    )),
    slotRender(ROW_REORDER_ANNOUNCER, (props) => (
      <RowReorderAnnouncer announcement={props.announcement} />
    )),
  ]);
}
