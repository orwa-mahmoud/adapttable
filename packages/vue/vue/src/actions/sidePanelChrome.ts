import {
  handleSidePanelBodyKey,
  handleSidePanelTabKey,
  type SidePanelModel,
  sidePanelModel,
} from "@adapttable/core";
import type { SidePanelSlots as NeutralSlots } from "@adapttable/core/binding";
import {
  defineComponent,
  h,
  nextTick,
  useId,
  type VNodeChild,
  watch,
} from "vue";

import { toVueAttrs } from "../attrs";
import { useScopeActivity } from "../store";
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
/** A complete compound presentation; the binding retains controlled selection. */
export interface SidePanelPresentationProps extends ActionPresentation {
  readonly view: SidePanelModel<SidePanelPanel>;
  readonly side: "start" | "end";
  readonly onSelect: (key: string) => void;
  readonly onClose: () => void;
  readonly onBodyKeyDown: (event: KeyboardEvent) => void;
  readonly isCurrent: () => boolean;
}
export type SidePanelPresentation = (
  props: SidePanelPresentationProps
) => VNodeChild;
export type SidePanelChromeProps = ActionPresentation & {
  readonly model: SidePanelControlModel;
} & (
    | { readonly slots: SidePanelSlots; readonly presentation?: undefined }
    | { readonly slots?: never; readonly presentation: SidePanelPresentation }
  );
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
    const active = useScopeActivity();
    let revision = 0;
    watch(
      [
        active,
        () => props.model,
        () => props.model.open,
        () => props.presentation,
      ],
      () => {
        revision++;
      },
      { flush: "sync" }
    );
    return () => {
      if (
        props.presentation !== undefined &&
        typeof props.presentation !== "function"
      )
        throw new Error(
          "AdaptTable: SidePanelChrome requires a complete presentation renderer."
        );
      if (!props.presentation)
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
      if (props.presentation) {
        const source = props.model;
        const presentation = props.presentation;
        const ticket = revision;
        const live = active.value;
        const isCurrent = () =>
          live &&
          active.value &&
          ticket === revision &&
          props.model === source &&
          props.presentation === presentation &&
          props.model.open !== null;
        const onClose = () => {
          if (isCurrent()) source.onOpenChange(null);
        };
        return presentation({
          view: model,
          side: source.side ?? "end",
          labels: props.labels,
          dir: props.dir,
          classNames: props.classNames,
          container: props.container,
          isCurrent,
          onSelect: (key) => {
            if (isCurrent() && source.panels.some((panel) => panel.key === key))
              source.onOpenChange(key);
          },
          onClose,
          onBodyKeyDown: (event) => {
            if (!isCurrent() || event.defaultPrevented) return;
            if (
              event.target instanceof Element &&
              event.target.closest('[role="dialog"],[role="menu"]')
            )
              return;
            handleSidePanelBodyKey(event, onClose);
          },
        });
      }
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
    props: [
      "model",
      "slots",
      "labels",
      "dir",
      "classNames",
      "container",
      "presentation",
    ],
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
