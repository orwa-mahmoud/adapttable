/**
 * Row drag/keyboard reorder — `@adapttable/angular-aria/row-reorder`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  type RowReorderHandler,
  type RowReorderOptions,
  slotRender,
} from "@adapttable/angular";
import {
  AdaptRowReorderAnnouncer,
  ROW_REORDER_ANNOUNCER,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
} from "@adapttable/angular/adapter";
import { rowReorder as coreAngularRowReorder } from "@adapttable/angular/features";

import { AdaptRowReorderButtons } from "./rowReorderButtons";
import { AdaptRowReorderGrip } from "./rowReorderGrip";

/**
 * Let rows be dragged, or moved with the keyboard, into a new order. The
 * table never writes to the host's array — the handler applies the move.
 *
 * @param onRowReorder - Called with the from/to indexes and the moved row.
 * @param options - Move policy and cross-boundary handlers.
 *
 * @public
 */
export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
): AdaptTableFeature {
  return extendFeature(coreAngularRowReorder(onRowReorder, options), [
    slotRender(ROW_REORDER_HANDLE, () => AdaptRowReorderGrip),
    slotRender(ROW_REORDER_BUTTONS, () => AdaptRowReorderButtons),
    slotRender(ROW_REORDER_ANNOUNCER, () => AdaptRowReorderAnnouncer),
  ]);
}
