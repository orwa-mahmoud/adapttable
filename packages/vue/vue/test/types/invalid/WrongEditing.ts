import { batchEditing, rowEditing } from "@adapttable/vue/features";
import type { EditingActionSlots } from "@adapttable/vue/adapter";
import type { TableFeature } from "@adapttable/vue";
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
