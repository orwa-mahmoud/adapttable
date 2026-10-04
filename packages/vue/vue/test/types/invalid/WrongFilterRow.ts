import type { TableFeature } from "@adapttable/vue/features";
import { filters } from "@adapttable/vue/filters";
interface Row {
  id: string;
  name: string;
}
export const wrong: TableFeature<Row> = filters<{ other: number }>([
  { key: "other", type: "number", getValue: (row) => row.other },
]);
