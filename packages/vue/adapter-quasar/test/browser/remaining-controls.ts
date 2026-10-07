import "quasar/dist/quasar.css";

import { Quasar } from "quasar";
import { createApp, defineComponent, h, shallowRef } from "vue";

import { DataTable } from "../../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../../src/cell-navigation";
import { commandPalette } from "../../src/command-palette";
import { contextMenu } from "../../src/context-menu";
import { groupingPanel } from "../../src/grouping-panel";
import { rowReorder } from "../../src/row-reorder";
import { sidePanel } from "../../src/side-panel";
const mobile = new URLSearchParams(location.search).get("mobile") === "1";
const rows = [
  { id: "a", name: "Ada", team: "Core", amount: 4 },
  { id: "b", name: "Bea", team: "Cloud", amount: 8 },
];
type Row = (typeof rows)[number];
createApp(
  defineComponent(() => {
    const requested = shallowRef("");
    const open = shallowRef<string | null>("details");
    const columns = [
      { key: "name", header: "Name" },
      { key: "team", header: "Team" },
      { key: "amount", header: "Amount", editable: true, aggregatable: true },
    ];
    const common = {
      data: rows,
      columns,
      rowKey: (row: Row) => row.id,
      searchable: false,
      urlSync: false,
      forceMobile: mobile,
      dir: "rtl" as const,
    };
    const navigation = [
      cellNavigation(),
      columnSelectionCheckbox(),
      commandPalette({
        button: true,
        commands: [
          {
            key: "disabled",
            label: "Custom blocked",
            disabled: true,
            onSelect: () => {
              requested.value = "wrong";
            },
          },
          {
            key: "run",
            label: "Custom run",
            onSelect: () => {
              requested.value = "command";
            },
          },
        ],
      }),
      contextMenu<Row>({
        items: () => [
          {
            key: "context",
            label: "Custom context",
            onSelect: () => {
              requested.value = "context";
            },
          },
        ],
      }),
      sidePanel({
        panels: [
          { key: "details", label: "Details", content: "Details body" },
          { key: "history", label: "History", content: "History body" },
        ],
        open,
        onOpenChange: (value) => {
          open.value = value;
        },
      }),
    ];
    const grouping = [
      groupingPanel<Row>("team"),
      rowReorder<Row>(
        (from, to) => {
          requested.value = `${from}:${to}`;
        },
        {
          movePolicy: "confirm",
          onGroupMove: () => {
            requested.value = "group";
          },
        }
      ),
    ];
    return () =>
      h("main", { style: { padding: "16px" } }, [
        h("section", { id: "navigation" }, [
          h(DataTable<Row>, { ...common, features: navigation }),
        ]),
        h("section", { id: "grouping" }, [
          h(DataTable<Row>, { ...common, features: grouping }),
        ]),
        h("output", { id: "requested" }, requested.value),
      ]);
  })
)
  .use(Quasar)
  .mount("#app");
