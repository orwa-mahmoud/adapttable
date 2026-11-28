import {
  DesktopTableChrome,
  type TableChromeClassNames,
  type TableChromeSlots,
  type UseDataTableShellResult,
  withProps,
} from "@adapttable/vue/adapter";
import { Card } from "ant-design-vue";
import { h, type VNodeChild } from "vue";

/** Semantic table rendering preserves prepared native cell/row contracts. */
export const AntdDesktopTable = /* @__PURE__ */ withProps(
  function AntdDesktopTable<TRow>(props: {
    readonly model: UseDataTableShellResult<TRow>["desktop"]["value"];
    readonly controls: TableChromeSlots<TRow>;
    readonly classNames?: TableChromeClassNames;
  }): VNodeChild {
    return h(
      Card,
      {
        class: "adapttable-ant-design-vue-table",
        bodyStyle: { padding: 0 },
      },
      {
        default: () =>
          DesktopTableChrome({
            model: props.model,
            slots: props.controls,
            classNames: props.classNames,
          }),
      }
    );
  },
  ["model", "controls", "classNames"]
);
