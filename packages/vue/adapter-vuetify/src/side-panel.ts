import type { StaticTableFeature } from "@adapttable/vue";
import {
  type ActionPresentation,
  extendFeature,
  SIDE_PANEL_CONTROL,
  SidePanelChrome,
  type SidePanelControlModel,
  type SidePanelSlots,
  slotRender,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { sidePanel as bindingSidePanel } from "@adapttable/vue/features";
import { defineComponent, h, type PropType } from "vue";
import { VCard } from "vuetify/components/VCard";

import { vuetifyButton } from "./controls";

/** Chrome is the sole tab keyboard owner; VBtn supplies every visible action. */
function controls(
  names: () => Readonly<Record<string, string | undefined>>
): SidePanelSlots {
  return {
    Frame: ({ children, className, side }) =>
      h(
        VCard,
        {
          tag: "aside",
          onKeydownCapture: (event: KeyboardEvent) => {
            // VSelect closes Escape without preventing it; reserve that key for
            // the expanded native popup before the binding handles panel Escape.
            if (
              event.key === "Escape" &&
              event.target instanceof Element &&
              event.target.closest('[aria-haspopup][aria-expanded="true"]')
            )
              event.preventDefault();
          },
          variant: "outlined",
          class: className,
          "data-adapttable-part": "side-panel",
          "data-side": side,
          style: { flex: "0 1 22rem", minWidth: 0, maxWidth: "100%" },
        },
        () => children
      ),
    Tab: ({ panel, buttonProps }) =>
      vuetifyButton(
        { ...toVueAttrs(buttonProps), class: names().sidePanelTab },
        panel.label
      ),
    Close: ({ label, onClose }) =>
      vuetifyButton(
        {
          "data-adapttable-part": "side-panel-close",
          class: names().sidePanelClose,
          "aria-label": label,
          onClick: onClose,
        },
        label
      ),
  };
}
const VuetifySidePanel = defineComponent(
  (props: ActionPresentation & { readonly model: SidePanelControlModel }) => {
    const slots = controls(() => props.classNames ?? {});
    return () => h(SidePanelChrome, { ...props, slots });
  },
  {
    name: "VuetifySidePanel",
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
      classNames: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: SidePanelControlModel;
          })["classNames"]
        >,
      },
      container: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: SidePanelControlModel;
          })["container"]
        >,
      },
    },
  }
);

export function sidePanel(
  options: Parameters<typeof bindingSidePanel>[0]
): StaticTableFeature {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL_CONTROL, (props) => h(VuetifySidePanel, props)),
  ]);
}
export type {
  SidePanelOptions,
  SidePanelPanel,
} from "@adapttable/vue/features";
