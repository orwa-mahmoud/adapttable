import { appendByKey } from "@adapttable/core";
import { coreSidePanel } from "@adapttable/core/binding";
import { computed, toValue, watch } from "vue";

import {
  SIDE_PANEL_CONTROL,
  SIDE_PANEL_MODEL,
  type SidePanelOptions,
  type SidePanelPanel,
} from "./actions/contracts";
import { featureActivity } from "./actions/lifecycle";
import type {
  FeatureMountContext,
  StaticTableFeature,
} from "./features/tableFeature";
function mountSidePanel<TRow>(context: FeatureMountContext<TRow>): void {
  const active = featureActivity(context);
  const model = computed(() => {
    const config = context.options.value.sidePanel as SidePanelOptions;
    const registered = context.featureHost.value.panels;
    const panels = appendByKey(
      config.panels,
      registered.map((entry) => {
        const panel = entry as SidePanelPanel;
        return { ...panel, label: panel.label ?? panel.key };
      }),
      (panel) => panel.key
    );
    return {
      panels,
      open: active() ? toValue(config.open) : null,
      side: config.side,
      onOpenChange: (key: string | null) => {
        if (active()) config.onOpenChange(key);
      },
    };
  });
  watch(model, (value) => context.state.set(SIDE_PANEL_MODEL, value), {
    immediate: true,
    flush: "sync",
  });
}
export function sidePanel(options: SidePanelOptions): StaticTableFeature {
  return {
    ...coreSidePanel(options),
    mount: mountSidePanel,
    requiredSlots: [SIDE_PANEL_CONTROL],
  };
}
export type {
  SidePanelControlModel,
  SidePanelOptions,
  SidePanelPanel,
} from "./actions/contracts";
export { SIDE_PANEL_CONTROL, SIDE_PANEL_MODEL } from "./actions/contracts";
export type {
  SidePanelChromeProps,
  SidePanelSlots,
} from "./actions/sidePanelChrome";
export {
  SidePanelChrome,
  SidePanelLayoutChrome,
} from "./actions/sidePanelChrome";
export type * from "./index";
