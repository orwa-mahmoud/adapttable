import "@adapttable/vue-unstyled/styles.css";
import "./consumer.css";

import { ar } from "@adapttable/i18n";
import type { FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import {
  type ColumnDef,
  DataTable,
  FilterHeaderControl,
  FilterHeaderRow,
} from "@adapttable/vue-unstyled";
import { filters } from "@adapttable/vue-unstyled/filters";
import { computed, createApp, defineComponent, h, shallowRef } from "vue";

interface Person {
  id: string;
  name: string;
  active: boolean;
}
const rows: readonly Person[] = [
  { id: "ada", name: "Ada", active: true },
  { id: "grace", name: "Grace", active: false },
];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", filter: "text" },
  { key: "active", header: "Active", filter: "boolean" },
];
const query = new URLSearchParams(location.search);
const dir = query.has("rtl") ? "rtl" : "ltr";
const labels = resolveLabels(query.has("rtl") ? ar : undefined);
document.documentElement.lang = query.has("rtl") ? "ar" : "en";
document.documentElement.dir = dir;
createApp(
  defineComponent({
    setup() {
      const custom = shallowRef(false);
      const extra = shallowRef<FilterFormSource<Person>["extra"]>({});
      const setExtra: FilterFormSource<Person>["setExtra"] = (key, value) => {
        extra.value = { ...extra.value, [key]: value };
      };
      const setExtras: FilterFormSource<Person>["setExtras"] = (patch) => {
        extra.value = { ...extra.value, ...patch };
      };
      const source = computed<FilterFormSource<Person>>(() => ({
        extra: extra.value,
        setExtra,
        setExtras,
      }));
      const tableFeatures = [filters<Person>([], { mode: "drawer" })];
      const other = shallowRef<HTMLDialogElement | null>(null);
      return () =>
        h("main", { dir }, [
          h("h1", "Native filter surfaces"),
          h(
            "button",
            {
              id: "custom-colors",
              onClick: () => {
                custom.value = !custom.value;
              },
            },
            "Toggle custom colors"
          ),
          h(
            "button",
            { id: "open-other", onClick: () => other.value?.showModal() },
            "Open unrelated dialog"
          ),
          h("dialog", { id: "other-dialog", ref: other }, [
            h("p", "Unrelated dialog"),
            h(
              "button",
              { onClick: () => other.value?.close() },
              "Close unrelated dialog"
            ),
          ]),
          h(DataTable<Person>, {
            data: rows,
            columns,
            rowKey: (row) => row.id,
            urlSync: false,
            tableLabel: "People",
            features: tableFeatures,
            labels,
            dir,
            forceMobile: query.has("mobile"),
            classNames: custom.value
              ? {
                  filtersBackdrop: "custom-scrim",
                  filtersPanel: "custom-panel",
                }
              : {},
          }),
          h("section", { "aria-label": "Compact filters" }, [
            h("h2", "Compact header controls"),
            h(FilterHeaderControl<Person>, {
              def: {
                key: "name",
                type: "multiSelect",
                options: [
                  { value: "Ada", label: "Ada" },
                  { value: "Grace", label: "Grace" },
                ],
              },
              source: source.value,
              labels,
            }),
            h("table", [
              h("thead", [
                h(FilterHeaderRow<Person>, {
                  columns,
                  defs: [
                    { key: "name", type: "text" },
                    { key: "active", type: "boolean" },
                  ],
                  source: source.value,
                  labels,
                }),
              ]),
            ]),
            h("output", { id: "compact-values" }, JSON.stringify(extra.value)),
          ]),
        ]);
    },
  })
).mount("#root");
