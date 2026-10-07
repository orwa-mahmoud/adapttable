import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  SIDE_PANEL_CONTROL,
  SidePanelChrome,
  type SidePanelSlots,
  slotRender,
} from "@adapttable/vue/adapter";
import { sidePanel as bindingSidePanel } from "@adapttable/vue/features";
import { QCard } from "quasar";
import { h } from "vue";

import QuasarButton from "./controls/QuasarButton.vue";

/** Chrome is the sole tab keyboard owner; QBtn supplies every visible action. */
function controls(
  names: Readonly<Record<string, string | undefined>> = {}
): SidePanelSlots {
  return {
    Frame: ({ children, className, side }) =>
      h(
        QCard,
        {
          tag: "aside",
          flat: true,
          bordered: true,
          class: className,
          "data-adapttable-part": "side-panel",
          "data-side": side,
          style: { flex: "0 1 22rem", minWidth: 0, maxWidth: "100%" },
        },
        () => children
      ),
    Tab: ({ panel, buttonProps }) =>
      h(QuasarButton, {
        attrs: { ...buttonProps, class: names.sidePanelTab },
        label: panel.label,
      }),
    Close: ({ label, onClose }) =>
      h(QuasarButton, {
        label,
        attrs: {
          "data-adapttable-part": "side-panel-close",
          class: names.sidePanelClose,
          "aria-label": label,
          onClick: onClose,
        },
      }),
  };
}
export function sidePanel(
  options: Parameters<typeof bindingSidePanel>[0]
): StaticTableFeature {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL_CONTROL, (props) =>
      h(SidePanelChrome, { ...props, slots: controls(props.classNames) })
    ),
  ]);
}
export type {
  SidePanelOptions,
  SidePanelPanel,
} from "@adapttable/vue/features";
