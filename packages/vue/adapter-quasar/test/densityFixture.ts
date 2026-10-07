import { h } from "vue";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";

export function densityFixture(
  mobile = false,
  onDensityChange: (density: "comfortable" | "compact") => void = () =>
    undefined
) {
  return h(DataTable<{ id: string }>, {
    data: [{ id: "a" }, { id: "b" }],
    columns: [{ key: "id" }],
    rowKey: (row) => row.id,
    density: "comfortable",
    onDensityChange,
    features: [densityChooser()],
    classNames: {
      densityToggle: "density-paint",
      densitySelect: "legacy-paint",
    },
    dir: "rtl",
    forceMobile: mobile,
    urlSync: false,
    searchable: false,
    paginationMode: "paged",
    defaults: { limit: 1 },
  });
}
