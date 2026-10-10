import { h } from "vue";

import { DataTable } from "../src";
import { editHistory, editing, undoRedoButtons } from "../src/editing";
import { filters } from "../src/filters";
import { headerFilters } from "../src/header-filters";
export interface FeatureRow {
  id: string;
  name: string;
}
export function featuresFixture(
  mobile: boolean,
  onEdit: (row: FeatureRow, key: string, value: unknown) => void = () =>
    undefined
) {
  return h(DataTable<FeatureRow>, {
    data: [{ id: "1", name: "Ada" }],
    columns: [{ key: "name", editable: true }],
    rowKey: (row) => row.id,
    urlSync: false,
    forceMobile: mobile,
    dir: "rtl",
    searchable: false,
    features: [
      filters<FeatureRow>([{ key: "name", type: "text" }], { tree: true }),
      headerFilters(),
      editing<FeatureRow>(onEdit),
      editHistory(),
      undoRedoButtons(),
    ],
  });
}
