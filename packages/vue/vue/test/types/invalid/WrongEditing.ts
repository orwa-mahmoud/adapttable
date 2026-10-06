import type { TableFeature } from "@adapttable/vue";
import type { EditingActionSlots } from "@adapttable/vue/adapter";
import { batchEditing, rowEditing } from "@adapttable/vue/features";
interface Row {
  id: string;
}
export const wrongRow: TableFeature<Row> = rowEditing<{ number: number }>(
  (row) => row.number
);
export const wrongBatch: TableFeature<Row> = batchEditing<{ number: number }>(
  (edits) => edits[0]?.row.number
);
export const missingButton: EditingActionSlots = {};
