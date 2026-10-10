import { h } from "vue";

import { DataTable } from "../src";
import { exportCsv } from "../src/export";
import { exportPdf } from "../src/export-pdf";
import { exportXlsx } from "../src/export-xlsx";

export function exportFixture(
  mobile = false,
  request: () => void = () => undefined
) {
  return h(
    "div",
    [exportCsv, exportPdf, exportXlsx].map((factory) =>
      h(DataTable<{ id: string; name: string }>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: mobile,
        searchable: false,
        dir: "rtl",
        features: [factory<{ id: string; name: string }>({ request })],
      })
    )
  );
}
