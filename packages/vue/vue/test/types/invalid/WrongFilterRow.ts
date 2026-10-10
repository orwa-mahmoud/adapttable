import type { TableFeature } from "@adapttable/vue";
import { filters } from "@adapttable/vue/features";
interface Row {
  id: string;
  name: string;
}
export const wrong: TableFeature<Row> = filters<{ other: number }>([
  { key: "other", type: "number", getValue: (row) => row.other },
]);
