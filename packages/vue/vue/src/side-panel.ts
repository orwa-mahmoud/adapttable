import { appendByKey } from "@adapttable/core";
import { coreSidePanel } from "@adapttable/core/binding";
import type { FeatureMountContext, StaticTableFeature } from "@adapttable/vue";
import { computed, toValue, watch } from "vue";

import {
  SIDE_PANEL_CONTROL,
  SIDE_PANEL_MODEL,
  type SidePanelOptions,
  type SidePanelPanel,
} from "./actions/contracts";
import { featureActivity } from "./actions/lifecycle";
function mountSidePanel<TRow>(context: FeatureMountContext<TRow>): void {
  const active = featureActivity(context);
  let hasActivated = context.active.value;
  watch(
    context.active,
    (value) => {
      if (value) hasActivated = true;
    },
    { flush: "sync" }
  );
  let requestOwner:
    | {
        config: SidePanelOptions;
        callback: SidePanelOptions["onOpenChange"];
        active: boolean;
        request: SidePanelOptions["onOpenChange"];
      }
    | undefined;
  const requestFor = (config: SidePanelOptions) => {
    const callback = config.onOpenChange;
    const activity = active();
    if (
      requestOwner?.config !== config ||
      requestOwner.callback !== callback ||
      requestOwner.active !== activity
    ) {
      const request = (key: string | null) => {
        const current = context.options.value.sidePanel as SidePanelOptions;
        if (
          active() &&
          requestOwner?.request === request &&
          current === config &&
          current.onOpenChange === callback
        )
          callback(key);
      };
      requestOwner = { config, callback, active: activity, request };
    }
    return requestOwner.request;
  };
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
      // Read the initial controlled projection for SSR and hydration. A later
      // suspension removes the panel, so retained DOM controls cannot revive.
      open: active() || !hasActivated ? toValue(config.open) : null,
      side: config.side,
      // A controlled open update retains the same callback owner.
      onOpenChange: requestFor(config),
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
  SidePanelPresentation,
  SidePanelPresentationProps,
  SidePanelSlots,
} from "./actions/sidePanelChrome";
export {
  SidePanelChrome,
  SidePanelLayoutChrome,
} from "./actions/sidePanelChrome";
