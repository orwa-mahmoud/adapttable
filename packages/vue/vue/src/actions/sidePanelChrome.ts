import {
  handleSidePanelBodyKey,
  handleSidePanelTabKey,
  type SidePanelModel,
  sidePanelModel,
} from "@adapttable/core";
import type { SidePanelSlots as NeutralSlots } from "@adapttable/core/binding";
import {
  type ComponentObjectPropsOptions,
  defineComponent,
  h,
  nextTick,
  onScopeDispose,
  type PropType,
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
function tabDomId(prefix: string, key: string): string {
  return `${prefix}-tab-${key
    .split("")
    .map((character) => character.charCodeAt(0).toString(16))
    .join("-")}`;
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
export const SidePanelChrome = /*#__PURE__*/ defineComponent(
  (props: SidePanelChromeProps) => {
    const id = `adapttable-side-panel-${useId()}`;
    const active = useScopeActivity();
    let revision = 0;
    let focusGeneration = 0;
    let disposed = false;
    watch(
      [
        () => active.value,
        () => props.model.onOpenChange,
        () => props.model.open === null,
        () => props.model.side,
        () => props.presentation,
        () => props.slots?.Frame,
        () => props.slots?.Tab,
        () => props.slots?.Close,
      ],
      () => {
        focusGeneration++;
      },
      { flush: "sync" }
    );
    onScopeDispose(() => {
      disposed = true;
      revision++;
    });
    // Getter sources avoid forcing retirement when only a slot wrapper changes.
    watch(
      [
        () => active.value,
        () => props.model,
        () => props.model.open,
        () => props.presentation,
        () => props.slots?.Frame,
        () => props.slots?.Tab,
        () => props.slots?.Close,
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
      const view = sidePanelModel({
        panels: props.model.panels,
        openPanel: props.model.open,
        idPrefix: id,
        labels: props.labels,
      });
      if (!view) return null;
      const model = {
        ...view,
        tabs: view.tabs.map((tab) => ({ ...tab, id: tabDomId(id, tab.key) })),
        bodyLabelledBy: view.tabbed
          ? tabDomId(id, view.selected.key)
          : undefined,
      };
      const source = props.model;
      const presentation = props.presentation;
      const frame = props.slots?.Frame;
      const tab = props.slots?.Tab;
      const close = props.slots?.Close;
      const ticket = revision;
      const live = active.value;
      const ownsRenderers = () =>
        props.presentation === presentation &&
        props.slots?.Frame === frame &&
        props.slots?.Tab === tab &&
        props.slots?.Close === close;
      const isCurrent = () =>
        !disposed &&
        live &&
        active.value &&
        ticket === revision &&
        props.model === source &&
        ownsRenderers() &&
        props.model.open !== null;
      const onSelect = (key: string) => {
        if (isCurrent() && source.panels.some((panel) => panel.key === key))
          source.onOpenChange(key);
      };
      const onClose = () => {
        if (isCurrent()) source.onOpenChange(null);
      };
      const onBodyKeyDown = (event: KeyboardEvent) => {
        if (!isCurrent() || event.defaultPrevented) return;
        if (
          event.target instanceof Element &&
          event.target.closest('[role="dialog"],[role="menu"]')
        )
          return;
        handleSidePanelBodyKey(event, onClose);
      };
      if (presentation) {
        return presentation({
          view: model,
          side: source.side ?? "end",
          labels: props.labels,
          dir: props.dir,
          classNames: props.classNames,
          container: props.container,
          isCurrent,
          onSelect,
          onClose,
          onBodyKeyDown,
        });
      }
      const onTabKey = (event: KeyboardEvent) => {
        if (!isCurrent() || event.defaultPrevented) return;
        const ownedFocus = focusGeneration;
        const origin =
          event.currentTarget instanceof HTMLElement
            ? event.currentTarget
            : null;
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
            panels: source.panels,
            selectedIndex: model.selectedIndex,
            onOpenPanel: onSelect,
            onClose,
          }
        );
        const target = model.tabs.find((tab) => tab.key === chosen);
        if (target)
          void nextTick(async () => {
            await nextTick();
            if (
              !disposed &&
              active.value &&
              focusGeneration === ownedFocus &&
              ownsRenderers() &&
              root?.isConnected &&
              origin?.isConnected &&
              origin.ownerDocument.activeElement === origin
            )
              focusPanelTab(root, target.id);
          });
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
                          onClick: () => onSelect(tab.key),
                          onKeyDown: onTabKey,
                        },
                      })
                    )
                  )
                : null,
              props.slots.Close({ label: model.closeLabel, onClose }),
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
              onKeyDown: onBodyKeyDown,
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
    props: {
      model: { type: Object as PropType<SidePanelChromeProps["model"]> },
      slots: { type: Object as PropType<SidePanelChromeProps["slots"]> },
      labels: { type: Object as PropType<SidePanelChromeProps["labels"]> },
      dir: { type: String as PropType<SidePanelChromeProps["dir"]> },
      classNames: {
        type: Object as PropType<SidePanelChromeProps["classNames"]>,
      },
      container: {
        type: Object as PropType<SidePanelChromeProps["container"]>,
      },
      presentation: {
        type: Function as PropType<SidePanelChromeProps["presentation"]>,
      },
    } as ComponentObjectPropsOptions<SidePanelChromeProps>,
  }
);
export const SidePanelLayoutChrome = /*#__PURE__*/ defineComponent(
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
  {
    name: "SidePanelLayoutChrome",
    props: {
      open: { type: Boolean as PropType<boolean>, default: undefined },
      side: { type: String as PropType<("start" | "end") | undefined> },
      mobile: {
        type: Boolean as PropType<boolean | undefined>,
        default: undefined,
      },
      panel: { type: Function as PropType<() => VNodeChild> },
    },
  }
);
