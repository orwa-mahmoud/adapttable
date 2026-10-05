import {
  handleSidePanelBodyKey,
  handleSidePanelTabKey,
  sidePanelModel,
} from "@adapttable/core";
import type { SidePanelSlots as NeutralSlots } from "@adapttable/core/binding";
import { defineComponent, h, nextTick, useId, type VNodeChild } from "vue";

import { toVueAttrs } from "../attrs";
import type {
  ActionPresentation,
  SidePanelControlModel,
  SidePanelPanel,
} from "./contracts";
export type SidePanelSlots = NeutralSlots<
  VNodeChild,
  SidePanelPanel,
  KeyboardEvent
>;
export interface SidePanelChromeProps extends ActionPresentation {
  readonly model: SidePanelControlModel;
  readonly slots: SidePanelSlots;
}
function logicalKey(key: string, rtl: boolean): string {
  if (!rtl) return key;
  if (key === "ArrowLeft") return "ArrowRight";
  return key === "ArrowRight" ? "ArrowLeft" : key;
}
function focusPanelTab(root: Element | null, id: string): void {
  for (const tab of root?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])
    if (tab.id === id) tab.focus();
}
function panelDirection(
  mobile: boolean | undefined,
  side: "start" | "end" | undefined
): "column" | "row" | "row-reverse" {
  if (mobile) return "column";
  return side === "start" ? "row-reverse" : "row";
}
export const SidePanelChrome = defineComponent(
  (props: SidePanelChromeProps) => {
    const id = `adapttable-side-panel-${useId()}`;
    return () => {
      for (const name of ["Frame", "Tab", "Close"] as const)
        if (typeof props.slots[name] !== "function")
          throw new Error(
            `AdaptTable: SidePanelChrome requires the ${name} control slot.`
          );
      if (props.model.open === null) return null;
      const model = sidePanelModel({
        panels: props.model.panels,
        openPanel: props.model.open,
        idPrefix: id,
        labels: props.labels,
      });
      if (!model) return null;
      const close = () => props.model.onOpenChange(null);
      const onTabKey = (event: KeyboardEvent) => {
        if (event.defaultPrevented) return;
        const root =
          event.currentTarget instanceof Element
            ? event.currentTarget.closest('[role="tablist"]')
            : null;
        const key = logicalKey(event.key, props.dir === "rtl");
        const chosen = handleSidePanelTabKey(
          {
            key,
            preventDefault: () => event.preventDefault(),
            stopPropagation: () => event.stopPropagation(),
          },
          {
            panels: props.model.panels,
            selectedIndex: model.selectedIndex,
            onOpenPanel: props.model.onOpenChange,
            onClose: close,
          }
        );
        if (chosen !== undefined)
          void nextTick(() => focusPanelTab(root, `${id}-tab-${chosen}`));
      };
      return props.slots.Frame({
        side: props.model.side ?? "end",
        className: props.classNames?.sidePanel,
        children: [
          h(
            "div",
            {
              "data-adapttable-part": "side-panel-header",
              class: props.classNames?.sidePanelHeader,
              dir: props.dir,
            },
            [
              model.tabbed
                ? h(
                    "div",
                    {
                      role: "tablist",
                      "aria-label": model.tablistLabel,
                      "data-adapttable-part": "side-panel-tabs",
                      class: props.classNames?.sidePanelTabs,
                    },
                    model.tabs.map((tab) =>
                      props.slots.Tab({
                        panel: tab.panel,
                        selected: tab.selected,
                        buttonProps: {
                          id: tab.id,
                          role: "tab",
                          type: "button",
                          tabIndex: tab.tabIndex,
                          "aria-selected": tab.selected,
                          "aria-controls": tab.controls,
                          "data-adapttable-part": "side-panel-tab",
                          onClick: () => props.model.onOpenChange(tab.key),
                          onKeyDown: onTabKey,
                        },
                      })
                    )
                  )
                : null,
              props.slots.Close({ label: model.closeLabel, onClose: close }),
            ]
          ),
          h(
            "div",
            toVueAttrs({
              id: model.bodyId,
              role: model.bodyRole,
              "aria-labelledby": model.bodyLabelledBy,
              "aria-label": model.bodyLabel,
              "data-adapttable-part": "side-panel-body",
              class: props.classNames?.sidePanelBody,
              onKeyDown: (event: KeyboardEvent) => {
                if (event.defaultPrevented) return;
                if (
                  event.target instanceof Element &&
                  event.target.closest('[role="dialog"],[role="menu"]')
                )
                  return;
                handleSidePanelBodyKey(event, close);
              },
            }),
            [
              typeof model.selected.content === "function"
                ? model.selected.content()
                : model.selected.content,
            ]
          ),
        ],
      });
    };
  },
  {
    name: "SidePanelChrome",
    props: ["model", "slots", "labels", "dir", "classNames", "container"],
  }
);
export const SidePanelLayoutChrome = defineComponent(
  (
    props: {
      readonly open: boolean;
      readonly side?: "start" | "end";
      readonly mobile?: boolean;
      readonly panel: () => VNodeChild;
    },
    { slots }
  ) =>
    () =>
      props.open
        ? h(
            "div",
            {
              "data-adapttable-part": "table-region",
              style: {
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                flexDirection: panelDirection(props.mobile, props.side),
              },
            },
            [
              h(
                "div",
                {
                  "data-adapttable-part": "table-region-main",
                  style: { flex: 1, minWidth: 0, width: "100%" },
                },
                slots.default?.()
              ),
              props.panel(),
            ]
          )
        : slots.default?.(),
  { name: "SidePanelLayoutChrome", props: ["open", "side", "mobile", "panel"] }
);
