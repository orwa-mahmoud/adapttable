import {
  batchEditing,
  type EditingActionSlots,
  rowEditing,
} from "@adapttable/vue/editing";
import type { TableFeature } from "@adapttable/vue/features";
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
