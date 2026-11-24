import { h } from "vue";

import { DataTable } from "../src";
import { bulkActions } from "../src/bulk-actions";
import { findInTable } from "../src/find-in-table";
import { print } from "../src/print";
import { selection } from "../src/selection";
import { selectionStats } from "../src/selection-stats";
import { statusBar } from "../src/status-bar";
export function actionsFixture(onPrint: () => void = () => undefined) {
  return h(DataTable<{ id: string; name: string }>, {
    data: [{ id: "a", name: "Ada" }],
    columns: [{ key: "name" }],
    rowKey: (row) => row.id,
    urlSync: false,
    forceMobile: false,
    dir: "rtl",
    features: [
      selection({ defaultSelectedIds: ["a"] }),
      print(onPrint, true),
      bulkActions([{ key: "run", label: "Run", onClick: () => undefined }]),
      findInTable({ button: true }),
      statusBar(),
      selectionStats(),
    ],
  });
}
