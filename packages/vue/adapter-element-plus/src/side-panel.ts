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
import { defineComponent, h } from "vue";

import { elementSidePanelSlots } from "./actions/elementRemainingControls";
const ElementSidePanelControl = defineComponent(
  (props: ActionPresentation & { readonly model: SidePanelControlModel }) => {
    const slots = elementSidePanelSlots(() => props.classNames ?? {});
    return () => h(SidePanelChrome, { ...props, slots });
  },
  {
    name: "ElementSidePanelControl",
    props: ["model", "labels", "dir", "container", "classNames"],
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
