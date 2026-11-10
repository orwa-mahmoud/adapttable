import { featureSlotKey, type RowSlotKey } from "@adapttable/core/binding";
import type { VNodeChild } from "vue";

import type { TableChromeSlots } from "./tableChrome";

/** Lazy adapter paint for the binding's structural group-row props. */
export type GroupRowSlotProps<TRow> = Parameters<
  NonNullable<TableChromeSlots<TRow>["GroupRow"]>
>[0];
/** What fills {@link GROUP_ROW}: one group row for any row type. */
export type GroupRowDraw = <TRow>(props: GroupRowSlotProps<TRow>) => VNodeChild;
// Keep the existing key ID so native feature fills retain their identity.
export const GROUP_ROW = featureSlotKey<never>(
  "vue-unstyled-group-row"
) as RowSlotKey<GroupRowDraw>;
/**
 * The group-row slot.
 *
 * @deprecated Use {@link GROUP_ROW}; it is typed for every row.
 */
export function groupRowSlotKey<_TRow = unknown>(): RowSlotKey<GroupRowDraw> {
  return GROUP_ROW;
}
