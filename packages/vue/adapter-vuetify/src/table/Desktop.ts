import type { DesktopTableModel, TableDensity } from "@adapttable/vue";
import {
  type DataTableClassNames,
  DesktopTableChrome,
  type TableChromeSlots,
  withProps,
} from "@adapttable/vue/adapter";
import { h, type VNode } from "vue";
import { VTable } from "vuetify/components/VTable";

/**
 * The binding's table inside Vuetify's table surface: `VTable` gives the
 * density, hover and wrapper; the binding draws the table itself.
 */
export const VuetifyDesktop = /* @__PURE__ */ withProps(
  function VuetifyDesktop<TRow>(props: {
    readonly model: DesktopTableModel<TRow>;
    readonly controls: TableChromeSlots<TRow>;
    readonly classNames: DataTableClassNames;
    readonly density?: TableDensity;
  }): VNode {
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
            DesktopTableChrome({
              model: props.model,
              slots: props.controls,
              classNames: props.classNames,
            }),
          ]),
      }
    );
  },
  ["model", "controls", "classNames", "density"]
);
