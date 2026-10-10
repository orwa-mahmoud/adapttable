import { Dark, QToggle, Quasar } from "quasar";
import ar from "quasar/lang/ar";
import en from "quasar/lang/en-US";
import { createApp, defineComponent, h, shallowRef } from "vue";

import { DataTable } from "../../src";
import { densityChooser } from "../../src/density";

const params = new URLSearchParams(location.search);
const dir = params.get("dir") === "rtl" ? "rtl" : "ltr";
if (dir === "rtl") await import("quasar/dist/quasar.rtl.css");
else await import("quasar/dist/quasar.css");
document.documentElement.dir = dir;
const mobile = params.get("mobile") === "1";
const density = shallowRef<"comfortable" | "compact">("comfortable");
const accepted = shallowRef(false);
const requests = shallowRef<string[]>([]);
const features = [densityChooser()];
const app = createApp(
  defineComponent(
    () => () =>
      h("main", { style: "padding:16px;max-width:1200px;margin:auto" }, [
        h("h1", "Quasar density toggle"),
        h(QToggle, {
          label: "Accept density changes",
          modelValue: accepted.value,
          "onUpdate:modelValue": (value: boolean) => {
            accepted.value = value;
          },
        }),
        h("p", { id: "density-requests" }, requests.value.join(", ")),
        h(DataTable<{ id: string; name: string }>, {
          data: [
            { id: "a", name: "Ada" },
            { id: "b", name: "Bea" },
          ],
          columns: [{ key: "name", header: "Name" }],
          rowKey: (row) => row.id,
          features,
          density: density.value,
          onDensityChange: (value) => {
            requests.value = [...requests.value, value];
            if (accepted.value) density.value = value;
          },
          forceMobile: mobile,
          dir,
          urlSync: false,
          searchable: false,
          paginationMode: "paged",
          defaults: { limit: 1 },
        }),
      ])
  )
);
app.use(Quasar, { lang: dir === "rtl" ? ar : en, plugins: { Dark } });
Dark.set(params.get("dark") === "1");
app.mount("#app");
