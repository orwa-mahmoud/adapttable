import type { FilterDef, FilterTypeSpec } from "@adapttable/vue";
import {
  defaultFilterRegistry,
  type FilterHeaderControlOptions,
} from "@adapttable/vue/adapter";
import { filterTypes } from "@adapttable/vue/features";
import { computed, defineComponent, h, ref } from "vue";

import { DataTable } from "../../src";
import { shadcnButton } from "../../src/controls";
import { filters } from "../../src/filters";
import { FilterHeaderControl } from "../../src/filters/FilterHeaderControl";
import { fullscreen } from "../../src/fullscreen";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "ada", name: "Ada" },
  { id: "bea", name: "Bea" },
];
const base = defaultFilterRegistry.get("multiSelect");
if (!base) throw new Error("Missing multi-choice filter type");
const nested: FilterTypeSpec = {
  ...base,
  type: "nested-choices",
  render<TRow>(props: FilterHeaderControlOptions<TRow>) {
    return h(FilterHeaderControl<TRow>, {
      ...props,
      def: { ...props.def, type: "multiSelect" },
    });
  },
};
const definitions: FilterDef<Row>[] = [
  { key: "name", type: "text", label: "Person" },
  {
    key: "choice",
    type: "nested-choices",
    label: "Choices",
    getValue: (row) => row.name,
    options: rows.map((row) => ({ value: row.name, label: row.name })),
  },
];
/** Mount in the authorized showcase harness and point its browser spec here. */
export default defineComponent({
  name: "ShadcnFilterPanelFixture",
  setup() {
    const mode = ref<"popover" | "drawer">("popover");
    const enabled = ref(true);
    const dir = ref<"ltr" | "rtl">("ltr");
    const features = computed(() => [
      fullscreen(),
      ...(enabled.value
        ? [
            filterTypes([nested]),
            filters(definitions, { mode: mode.value, tree: true }),
          ]
        : []),
    ]);
    return () =>
      h("main", { class: "mx-auto grid max-w-4xl gap-4 p-4", dir: dir.value }, [
        h("div", { class: "flex flex-wrap gap-2" }, [
          shadcnButton({
            attrs: {
              id: "mode-toggle",
              onClick: () => {
                mode.value = mode.value === "popover" ? "drawer" : "popover";
              },
            },
            label: "Toggle mode",
          }),
          shadcnButton({
            attrs: {
              id: "direction-toggle",
              onClick: () => {
                dir.value = dir.value === "ltr" ? "rtl" : "ltr";
              },
            },
            label: "Toggle direction",
          }),
          shadcnButton({
            attrs: {
              id: "feature-toggle",
              onClick: () => {
                enabled.value = !enabled.value;
              },
            },
            label: "Toggle filters",
          }),
          shadcnButton({
            attrs: { id: "outside-focus" },
            label: "Outside target",
          }),
        ]),
        h(DataTable<Row>, {
          data: rows,
          columns: [{ key: "name", header: "Name" }],
          rowKey: (row) => row.id,
          features: features.value,
          dir: dir.value,
          urlSync: false,
        }),
      ]);
  },
});
