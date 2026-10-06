import type {
  BatchEditBarProps,
  RowEditActionsProps,
} from "@adapttable/core/binding";
import type {
  BatchEditingState,
  EditCommitSnapshot,
  EditingBundle,
  ExternalStoreOptions,
  RowEditingState,
  TableEditingOptions,
  TableFeature,
} from "@adapttable/vue";
import {
  batchEditing,
  batchEditing as batchSubpath,
  editing,
  rowEditing,
} from "@adapttable/vue/features";
import type { EditingActionSlots } from "@adapttable/vue/adapter";
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
