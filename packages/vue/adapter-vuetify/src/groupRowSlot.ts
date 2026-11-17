import {
  featureSlotKey,
  type GroupRowDraw,
  type RowSlotKey,
} from "@adapttable/vue/adapter";

export const VUETIFY_GROUP_ROW = featureSlotKey<never>(
  "vuetify-group-row"
) as RowSlotKey<GroupRowDraw>;
