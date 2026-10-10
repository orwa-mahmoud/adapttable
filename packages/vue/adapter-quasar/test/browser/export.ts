import { Dark, QBtn, QToggle, Quasar } from "quasar";
import ar from "quasar/lang/ar";
import en from "quasar/lang/en-US";
import { createApp, defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../../src";
import { exportCsv } from "../../src/export";

const params = new URLSearchParams(location.search);
const dir = params.get("dir") === "rtl" ? "rtl" : "ltr";
if (dir === "rtl") await import("quasar/dist/quasar.rtl.css");
else await import("quasar/dist/quasar.css");
document.documentElement.dir = dir;
const live = shallowRef(true);
let job:
  | {
      resolve: (value: { url: string }) => void;
      reject: (error: Error) => void;
    }
  | undefined;
const features = [
  exportCsv<{ id: string; name: string }>({
    scope: "all",
    onExportAll: (_query, control) => {
      control.setProgress?.(42);
      control.setMessage?.("42 rows prepared");
      return new Promise<{ url: string }>((resolve, reject) => {
        job = { resolve, reject };
      });
    },
  }),
];
const Table = defineComponent(
  () => () =>
    h(DataTable<{ id: string; name: string }>, {
      data: [
        { id: "a", name: "Ada" },
        { id: "b", name: "Bea" },
      ],
      columns: [{ key: "name", header: "Name" }],
      rowKey: (row) => row.id,
      features,
      forceMobile: params.get("mobile") === "1",
      dir,
      urlSync: false,
      searchable: false,
    })
);
const app = createApp(
  defineComponent(
    () => () =>
      h("main", { style: "padding:16px;max-width:1200px;margin:auto" }, [
        h("h1", "Quasar export progress"),
        h(QBtn, {
          id: "complete-export",
          label: "Complete export",
          onClick: () => job?.resolve({ url: "data:text/csv,id%0Aa" }),
        }),
        h(QBtn, {
          id: "fail-export",
          label: "Fail export",
          onClick: () => job?.reject(new Error("Try again")),
        }),
        h(QToggle, {
          label: "Show table",
          modelValue: live.value,
          "onUpdate:modelValue": (value: boolean) => {
            live.value = value;
          },
        }),
        h(KeepAlive, {}, () => (live.value ? h(Table) : null)),
      ])
  )
);
app.use(Quasar, { lang: dir === "rtl" ? ar : en, plugins: { Dark } });
Dark.set(params.get("dark") === "1");
app.mount("#app");
