/** Native HTML is this adapter's kit; bindings own tree/detail actions. */
import type { TableChromeSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

export function nativeHierarchyControls<TRow>(): Pick<
  TableChromeSlots<TRow>,
  "TreeToggle" | "RowDetailToggle"
> {
  const chevron = (expanded: boolean) =>
    h("span", { "aria-hidden": "true" }, expanded ? "−" : "+");
  return {
    TreeToggle: ({ attrs, expanded, loading }) =>
      h("button", attrs, [
        loading ? h("span", { "aria-hidden": "true" }, "…") : chevron(expanded),
      ]),
    RowDetailToggle: ({ attrs, expanded }) =>
      h("button", attrs, [chevron(expanded)]),
  };
}
