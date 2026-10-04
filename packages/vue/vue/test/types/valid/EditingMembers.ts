import type {
  BatchEditBarProps,
  BatchEditingState,
  EditCommitSnapshot,
  EditingBundle,
  RowEditActionsProps,
  RowEditingState,
} from "@adapttable/vue";
import { batchEditing as batchSubpath } from "@adapttable/vue/batch-editing";
import {
  batchEditing,
  editing,
  type EditingActionSlots,
  type ExternalStoreOptions,
  rowEditing,
  type TableEditingOptions,
} from "@adapttable/vue/editing";
import type { TableFeature } from "@adapttable/vue/features";
interface Row {
  id: string;
  name: string;
}
const cell = editing<Row>((row, key, value) => {
  return { name: row.name.toUpperCase(), key: key.toLowerCase(), value };
});
const whole = rowEditing<Row>((row, patch) => {
  return { name: row.name.toUpperCase(), patch };
});
const batch = batchEditing<Row>((edits) =>
  edits.forEach((edit) => edit.row.name.toUpperCase())
);
export const features: readonly TableFeature<Row>[] = [
  cell,
  whole,
  batch,
  batchSubpath<Row>(() => undefined),
];
export type Members = [
  EditingBundle<Row>,
  RowEditingState<Row>,
  BatchEditingState<Row>,
  EditCommitSnapshot,
  RowEditActionsProps<Row>,
  BatchEditBarProps<Row>,
  TableEditingOptions<Row>,
  EditingActionSlots,
  ExternalStoreOptions,
];
