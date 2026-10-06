import { type FeatureSlotKey, featureSlotKey } from "@adapttable/core/binding";

import type { TableChromeSlots } from "./tableChrome";

/** Lazy adapter paint for the binding's structural group-row props. */
export type GroupRowSlotProps<TRow> = Parameters<
  NonNullable<TableChromeSlots<TRow>["GroupRow"]>
>[0];
// Keep the existing key ID so native feature fills retain their identity.
export const GROUP_ROW: FeatureSlotKey<GroupRowSlotProps<unknown>> =
  featureSlotKey<GroupRowSlotProps<unknown>>("vue-unstyled-group-row");
export function groupRowSlotKey<TRow>(): FeatureSlotKey<
  GroupRowSlotProps<TRow>
> {
  return GROUP_ROW as unknown as FeatureSlotKey<GroupRowSlotProps<TRow>>;
}
