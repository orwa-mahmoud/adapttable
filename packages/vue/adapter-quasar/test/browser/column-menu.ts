import "quasar/dist/quasar.css";

import type { TableFeature } from "@adapttable/vue";
import { AppFullscreen, Dark, Quasar } from "quasar";
import { createApp, defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../../src";
import { columnMenu } from "../../src/column-menu";
import { fullscreen } from "../../src/fullscreen";

interface Row {
  id: string;
  name: string;
  amount: number;
}
const visible = shallowRef(true);
const dir = shallowRef<"ltr" | "rtl">("ltr");
const mobile = shallowRef(false);
const accepted = shallowRef(false);
const value = shallowRef("sum");
const requests = shallowRef<string[]>([]);
const choice: TableFeature<Row> = {
  id: "browser-proof-choice",
  setup(host) {
    host.registerColumnMenuAction(() => ({
      kind: "choice",
      id: "aggregate",
      label: "Aggregate",
      value: value.value,
      disabled: false,
      options: [
        { value: "sum", label: "Sum" },
        { value: "avg", label: "Average" },
      ],
      onChange(next) {
        requests.value = [...requests.value, next];
        if (accepted.value) value.value = next;
      },
    }));
  },
};
const Table = defineComponent(
  () => () =>
    h(DataTable<Row>, {
      data: [
        { id: "a", name: "Ada", amount: 24 },
        { id: "b", name: "Bea", amount: 35 },
      ],
      columns: [
        { key: "name", header: "Name", sortable: true, renameable: true },
        { key: "amount", header: "Amount", renameable: true },
      ],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: mobile.value,
      dir: dir.value,
      features: [columnMenu(), fullscreen(), choice],
    })
);
const app = createApp(
  defineComponent(
    () => () =>
      h("main", { style: "padding:24px;max-width:1200px;margin:auto" }, [
        h("h1", "Quasar column menu acceptance"),
        h(
          "nav",
          { style: "display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px" },
          [
            h(
              "button",
              {
                id: "toggle-activity",
                onClick: () => {
                  visible.value = !visible.value;
                },
              },
              visible.value ? "Suspend" : "Reactivate"
            ),
            h(
              "button",
              {
                id: "toggle-direction",
                onClick: () => {
                  dir.value = dir.value === "ltr" ? "rtl" : "ltr";
                },
              },
              dir.value
            ),
            h(
              "button",
              {
                id: "toggle-mobile",
                onClick: () => {
                  mobile.value = !mobile.value;
                },
              },
              mobile.value ? "Mobile" : "Desktop"
            ),
            h(
              "button",
              { id: "toggle-theme", onClick: () => Dark.toggle() },
              "Toggle theme"
            ),
            h(
              "button",
              {
                id: "toggle-accept",
                onClick: () => {
                  accepted.value = !accepted.value;
                },
              },
              accepted.value ? "Accept changes" : "Reject changes"
            ),
            h("button", { id: "outside-focus" }, "Outside focus"),
          ]
        ),
        h(
          "output",
          { id: "choice-requests" },
          `Value: ${value.value}; requests: ${requests.value.join(", ")}`
        ),
        h(KeepAlive, {}, { default: () => (visible.value ? h(Table) : null) }),
      ])
  )
);
app.use(Quasar, { plugins: { AppFullscreen, Dark } });
app.mount("#app");
