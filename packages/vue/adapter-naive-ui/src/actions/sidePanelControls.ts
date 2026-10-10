import { type SidePanelSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { NCard } from "naive-ui";
import { h } from "vue";

import { naiveButton } from "../controls/button";

export const naiveSidePanelSlots = (
  names: Readonly<Record<string, string | undefined>> = {}
): SidePanelSlots => ({
  Frame: (props) =>
    h(
      NCard,
      {
        tag: "aside",
        size: "small",
        "data-adapttable-part": "side-panel",
        class: props.className,
        "data-side": props.side,
        style: { minWidth: "min(18rem,100%)", maxWidth: "100%" },
      },
      { default: () => props.children }
    ),
  Tab: (props) =>
    naiveButton(
      { ...toVueAttrs(props.buttonProps), class: names.sidePanelTab },
      props.panel.label
    ),
  Close: (props) =>
    naiveButton(
      {
        "aria-label": props.label,
        "data-adapttable-part": "side-panel-close",
        class: names.sidePanelClose,
        onClick: props.onClose,
      },
      props.label
    ),
});
