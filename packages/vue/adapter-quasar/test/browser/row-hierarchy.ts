import "quasar/dist/quasar.css";

import { Quasar } from "quasar";
import { createApp, defineComponent, h, shallowRef } from "vue";

import { DataTable } from "../../src";
import { pinnedSummaryRows } from "../../src/pinned-summary-rows";
import { rowActions } from "../../src/row-actions";
import { virtualize } from "../../src/virtualize";
import {
  hierarchyColumns,
  type HierarchyRow,
  hierarchyRows,
  rowHierarchyFixture,
} from "../rowHierarchyFixture";

const mobile = new URLSearchParams(location.search).get("mobile") === "1";
createApp(
  defineComponent(() => {
    const requested = shallowRef("");
    const actions = rowActions<HierarchyRow>([
      {
        key: "open",
        label: "Open record",
        onClick: (row) => {
          requested.value = row.id;
        },
      },
    ]);
    const windowed = [
      virtualize({ maxHeight: 300 }),
      pinnedSummaryRows<HierarchyRow>({
        top: [{ id: "total", name: "Window total", score: 150 }],
      }),
    ];
    const rows = Array.from({ length: 150 }, (_, index) => ({
      id: String(index),
      name: `Window row ${index}`,
      score: index,
    }));
    return () =>
      h("main", { style: { padding: "16px" } }, [
        h("section", { id: "hierarchy" }, [rowHierarchyFixture(mobile)]),
        h("section", { id: "actions" }, [
          h(DataTable<HierarchyRow>, {
            data: hierarchyRows,
            columns: hierarchyColumns,
            rowKey: (row) => row.id,
            forceMobile: mobile,
            urlSync: false,
            searchable: false,
            rowActionsLayout: "menu",
            features: [actions],
          }),
          h("output", { id: "row-request" }, requested.value),
        ]),
        h("section", { id: "window" }, [
          h(DataTable<HierarchyRow>, {
            data: rows,
            columns: hierarchyColumns,
            rowKey: (row) => row.id,
            forceMobile: mobile,
            urlSync: false,
            searchable: false,
            paginationMode: "infinite",
            defaults: { limit: 200 },
            features: windowed,
          }),
        ]),
      ]);
  })
)
  .use(Quasar)
  .mount("#app");
