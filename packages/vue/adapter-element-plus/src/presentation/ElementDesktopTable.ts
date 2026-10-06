import {
  DesktopTableChrome,
  type TableChromeClassNames,
  type TableChromeSlots,
  type UseDataTableShellResult,
} from "@adapttable/vue/adapter";
import { ElCard } from "element-plus";
import { h, type VNodeChild } from "vue";

/** Semantic table rendering preserves prepared native cell/row contracts. */
export function ElementDesktopTable<TRow>(props: {
  readonly model: UseDataTableShellResult<TRow>["desktop"]["value"];
  readonly controls: TableChromeSlots<TRow>;
  readonly classNames?: TableChromeClassNames;
}): VNodeChild {
  return h(
    ElCard,
    {
      shadow: "never",
      class: "adapttable-element-plus-table",
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
}
ElementDesktopTable.props = ["model", "controls", "classNames"];
