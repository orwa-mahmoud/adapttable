import type { StaticTableFeature } from "@adapttable/vue";
import {
  type ActionPresentation,
  extendFeature,
  SIDE_PANEL_CONTROL,
  SidePanelChrome,
  type SidePanelControlModel,
  slotRender,
} from "@adapttable/vue/adapter";
import { sidePanel as bindingSidePanel } from "@adapttable/vue/features";
import { defineComponent, h, type PropType } from "vue";

import { elementSidePanelSlots } from "./actions/elementRemainingControls";
const ElementSidePanelControl = defineComponent(
  (props: ActionPresentation & { readonly model: SidePanelControlModel }) => {
    const slots = elementSidePanelSlots(() => props.classNames ?? {});
    return () => h(SidePanelChrome, { ...props, slots });
  },
  {
    name: "ElementSidePanelControl",
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
    slotRender(SIDE_PANEL_CONTROL, (props) =>
      h(ElementSidePanelControl, props)
    ),
  ]);
}
export type {
  SidePanelOptions,
  SidePanelPanel,
} from "@adapttable/vue/features";
