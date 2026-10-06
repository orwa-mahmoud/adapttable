import type { DesktopTableModel, TableDensity } from "@adapttable/vue";
import {
  type DataTableClassNames,
  mergeVueAttrs,
  type TableChromeSlots,
  TableSummaryChrome,
} from "@adapttable/vue/adapter";
import { h, type VNode } from "vue";
import { VTable } from "vuetify/components/VTable";

import { vuetifyColumnSpacer, vuetifyHeaderRows } from "./headers";
import { vuetifyBodyRows } from "./rows";

/** Vuetify's supported wrapper slot keeps the semantic table replaceable. */
export function VuetifyDesktop<TRow>(props: {
  readonly model: DesktopTableModel<TRow>;
  readonly controls: TableChromeSlots<TRow>;
  readonly classNames: DataTableClassNames;
  readonly density?: TableDensity;
}): VNode {
  const { model, controls, classNames: names } = props;
  return h(
    VTable,
    {
      class: "adapttable-vuetify-table",
      density: props.density === "compact" ? "compact" : "default",
      hover: true,
    },
    {
      wrapper: () =>
        h("div", { class: "v-table__wrapper" }, [
          h(
            "table",
            mergeVueAttrs(model.attrs, {
              "data-adapttable-part": "table",
              class: names.table,
            }),
            [
              h(
                "thead",
                { "data-adapttable-part": "thead", class: names.thead },
                [vuetifyHeaderRows(model, controls, names)]
              ),
              h(
                "tbody",
                { "data-adapttable-part": "tbody", class: names.tbody },
                [vuetifyBodyRows(model, controls, names)]
              ),
              model.summary
                ? h(TableSummaryChrome<TRow>, {
                    model: model.summary,
                    footer: controls.footer,
                    classNames: names,
                    leading: [
                      ...(model.expandLabel ? ["expand"] : []),
                      ...(model.headerCheckboxAttrs ? ["selection"] : []),
                      ...(model.reorderLabel ? ["reorder"] : []),
                    ],
                    trailing: model.actionsLabel ? ["actions"] : [],
                    startSpacer: () =>
                      vuetifyColumnSpacer(model, "td", "start"),
                    endSpacer: () => vuetifyColumnSpacer(model, "td", "end"),
                  })
                : null,
            ]
          ),
        ]),
    }
  );
}
VuetifyDesktop.props = ["model", "controls", "classNames", "density"];
