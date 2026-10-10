import type { Attrs } from "@adapttable/vue";
import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  LoaderCircle,
} from "@lucide/vue";
import { h, type VNodeChild } from "vue";

import { Button } from "./components/button";
import { shadcnControlAttrs, shadcnSelectionCheckbox } from "./controls";

export function shadcnAction(attrs: Attrs, content: VNodeChild): VNodeChild {
  return h(
    Button,
    { variant: "outline", type: "button", ...shadcnControlAttrs(attrs) },
    () => content
  );
}

/** Binding-prepared actions are rendered without introducing table state. */
export function shadcnTableControls<TRow>(): TableChromeSlots<TRow> {
  const chevron = (expanded: boolean) =>
    h(expanded ? ChevronDown : ChevronRight, {
      class: expanded ? "size-4" : "size-4 rtl:rotate-180",
      "aria-hidden": true,
    });
  return {
    SortButton: ({ attrs, content }) =>
      shadcnAction({ variant: "ghost", ...attrs }, content),
    SelectionCheckbox: shadcnSelectionCheckbox,
    ResizeHandle: ({ attrs }) =>
      shadcnAction(
        attrs,
        h(GripVertical, { class: "size-3", "aria-hidden": true })
      ),
    ColumnGroupToggle: (props) =>
      ColumnGroupToggleChrome({
        ...props,
        slots: {
          Button: ({ label, expanded, className, onClick }) =>
            shadcnAction(
              {
                variant: "ghost",
                size: "icon-sm",
                class: className,
                "data-adapttable-part": "column-group-toggle",
                "aria-label": label,
                "aria-expanded": expanded,
                title: label,
                onClick,
              },
              chevron(expanded)
            ),
        },
      }),
    TreeToggle: ({ attrs, expanded, loading }) =>
      shadcnAction(
        { variant: "ghost", size: "icon-sm", ...attrs },
        loading
          ? h(LoaderCircle, {
              class: "size-4 animate-spin",
              "aria-hidden": true,
            })
          : chevron(expanded)
      ),
    RowDetailToggle: ({ attrs, expanded }) =>
      shadcnAction(
        { variant: "ghost", size: "icon-sm", ...attrs },
        chevron(expanded)
      ),
  };
}
