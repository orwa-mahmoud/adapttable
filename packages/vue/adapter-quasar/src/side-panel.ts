import type { StaticTableFeature } from "@adapttable/vue";
import {
  type ActionPresentation,
  extendFeature,
  SIDE_PANEL_CONTROL,
  SidePanelChrome,
  type SidePanelControlModel,
  type SidePanelSlots,
  slotRender,
} from "@adapttable/vue/adapter";
import { sidePanel as bindingSidePanel } from "@adapttable/vue/features";
import { QCard } from "quasar";
import { defineComponent, h, type PropType } from "vue";

import QuasarButton from "./controls/QuasarButton.vue";

/** Chrome is the sole tab keyboard owner; QBtn supplies every visible action. */
function controls(
  names: () => Readonly<Record<string, string | undefined>>
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
        attrs: { ...buttonProps, class: names().sidePanelTab },
        label: panel.label,
      }),
    Close: ({ label, onClose }) =>
      h(QuasarButton, {
        label,
        attrs: {
          "data-adapttable-part": "side-panel-close",
          class: names().sidePanelClose,
          "aria-label": label,
          onClick: onClose,
        },
      }),
  };
}
const QuasarSidePanelControl = /*#__PURE__*/ defineComponent(
  (props: ActionPresentation & { readonly model: SidePanelControlModel }) => {
    const slots = controls(() => props.classNames ?? {});
    return () => h(SidePanelChrome, { ...props, slots });
  },
  {
    name: "QuasarSidePanelControl",
    props: {
      model: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: SidePanelControlModel;
          })["model"]
        >,
      },
      labels: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: SidePanelControlModel;
          })["labels"]
        >,
      },
      dir: {
        type: String as PropType<
          (ActionPresentation & {
            readonly model: SidePanelControlModel;
          })["dir"]
        >,
      },
      container: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: SidePanelControlModel;
          })["container"]
        >,
      },
      classNames: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: SidePanelControlModel;
          })["classNames"]
        >,
      },
    },
  }
);
export function sidePanel(
  options: Parameters<typeof bindingSidePanel>[0]
): StaticTableFeature {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL_CONTROL, (props) => h(QuasarSidePanelControl, props)),
  ]);
}
export type {
  SidePanelOptions,
  SidePanelPanel,
} from "@adapttable/vue/features";
