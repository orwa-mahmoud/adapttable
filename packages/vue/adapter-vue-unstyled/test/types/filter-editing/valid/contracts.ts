import type { ComposedFeature } from "@adapttable/vue";
import { batchEditing } from "@adapttable/vue-unstyled/batch-editing";
import {
  type BatchRowEdit,
  type CellEditHandler,
  editing,
  type EditingLifecycleExtras,
  rowEditing,
} from "@adapttable/vue-unstyled/editing";
import {
  filters,
  type FiltersOptions,
  filterTypes,
} from "@adapttable/vue-unstyled/filters";
interface Item {
  id: string;
  value: number;
}
const callback: CellEditHandler<Item> = (row, column, value) => {
  return [row.value.toFixed(), column.toUpperCase(), String(value)];
};
const extras: EditingLifecycleExtras<Item> = {
  onEditError: (event) => {
    return [
      String(event.error),
      event.row.id.toUpperCase(),
      event.columnKey.toUpperCase(),
    ];
  },
  onEditRollback: (row) => {
    return row.value.toFixed();
  },
};
const options: FiltersOptions = { mode: "popover", tree: true };
export const composed: readonly ComposedFeature<Item>[] = [
  filters<Item>([{ key: "value", type: "numberRange" }], options),
  filterTypes([]),
  editing(callback, extras),
  rowEditing<Item>((row, patch) => {
    return [row.value.toFixed(), Object.keys(patch)];
  }),
  batchEditing<Item>((changes: readonly BatchRowEdit<Item>[]) =>
    changes.map((change) => change.row.value)
  ),
];
