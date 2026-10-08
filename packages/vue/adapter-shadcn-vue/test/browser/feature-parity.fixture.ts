import { defineComponent, h, ref } from "vue";

import { ar } from "../../../../shared/i18n/src/locales/ar";
import { DataTable } from "../../src";
import { commandPalette } from "../../src/command-palette";
import { shadcnButton } from "../../src/controls";
import { fullscreen } from "../../src/fullscreen";
import { groupingPanel } from "../../src/grouping-panel";
import { PivotPanel, type PivotPanelProps } from "../../src/pivot";
import { rowActions } from "../../src/row-actions";
import { rowReorder } from "../../src/row-reorder";
import { savedViews } from "../../src/saved-views";

const initial = [
  { id: "ada", name: "Ada", team: "Core", amount: 4 },
  { id: "bea", name: "Bea", team: "Ops", amount: 8 },
  { id: "cy", name: "Cy", team: "Core", amount: 6 },
];
type Row = (typeof initial)[number];

/** A real-adapter browser fixture; host callbacks own every data change. */
export default defineComponent({
  name: "ShadcnFeatureParityFixture",
  setup() {
    const rows = ref(initial);
    const dir = ref<"ltr" | "rtl">("ltr");
    const mobile = ref(false);
    const result = ref("");
    const config = ref<PivotPanelProps["config"]>({
      rows: [],
      columns: [],
      measures: [],
    });
    const features = [
      fullscreen(),
      groupingPanel<Row>(),
      savedViews({ storageKey: "shadcn-feature-parity" }),
      rowActions<Row>([
        {
          key: "inspect",
          label: "Inspect",
          onClick: (row) => {
            result.value = `Inspect ${row.name}`;
          },
        },
      ]),
      rowReorder<Row>((from, to, row) => {
        const next = [...rows.value];
        next.splice(from, 1);
        next.splice(to, 0, row);
        rows.value = next;
        result.value = `Moved ${row.name}`;
      }),
      commandPalette({
        button: true,
        commands: [
          {
            key: "report",
            label: "Show report",
            onSelect: () => {
              result.value = "Report requested";
            },
          },
        ],
      }),
    ];
    return () =>
      h("main", { dir: dir.value, class: "mx-auto grid max-w-5xl gap-6 p-4" }, [
        h("div", { class: "flex flex-wrap gap-2" }, [
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
              id: "mobile-toggle",
              onClick: () => {
                mobile.value = !mobile.value;
              },
            },
            label: "Toggle mobile",
          }),
          shadcnButton({
            attrs: { id: "outside-focus" },
            label: "Outside target",
          }),
        ]),
        h(DataTable<Row>, {
          data: rows.value,
          columns: [
            { key: "name", header: "Name" },
            { key: "team", header: "Team", groupable: true },
            { key: "amount", header: "Amount", aggregatable: true },
          ],
          rowKey: (row) => row.id,
          features,
          dir: dir.value,
          locale: dir.value === "rtl" ? "ar" : "en",
          labels: dir.value === "rtl" ? ar : undefined,
          forceMobile: mobile.value,
          rowActionsLayout: "menu",
          urlSync: false,
          searchable: false,
        }),
        h(PivotPanel, {
          fields: [
            { key: "team", label: "Team" },
            { key: "amount", label: "Amount" },
          ],
          config: config.value,
          onChange: (next) => {
            config.value = next;
          },
          className: "parity-pivot",
        }),
        h("output", { id: "host-result", "aria-live": "polite" }, result.value),
      ]);
  },
});
