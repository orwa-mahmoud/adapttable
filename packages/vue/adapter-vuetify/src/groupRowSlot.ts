import type { FeatureSlotKey } from "@adapttable/vue";
import { featureSlotKey, type TableChromeSlots } from "@adapttable/vue/adapter";

type GroupRowProps<TRow> = Parameters<
  NonNullable<TableChromeSlots<TRow>["GroupRow"]>
>[0];
export const VUETIFY_GROUP_ROW =
  featureSlotKey<GroupRowProps<unknown>>("vuetify-group-row");
export function vuetifyGroupRowSlotKey<TRow>(): FeatureSlotKey<
  GroupRowProps<TRow>
> {
  return VUETIFY_GROUP_ROW as unknown as FeatureSlotKey<GroupRowProps<TRow>>;
}
