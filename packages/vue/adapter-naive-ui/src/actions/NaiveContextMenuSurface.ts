import {
  type ContextMenuSurfaceProps,
  createMenuNavigation,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { NCard, NPopover } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  nextTick,
  type PropType,
  shallowRef,
  type VNodeChild,
  watch,
} from "vue";

import { htmlRoot } from "../controls/elementTarget";
/** Native surfaces apply the shared core's menu-navigation decisions. */
export const NaiveContextMenuSurface = /*#__PURE__*/ defineComponent(
  (props: ContextMenuSurfaceProps<VNodeChild>) => {
    const active = useScopeActivity();
    const card = shallowRef<ComponentPublicInstance | null>(null);
    const navigation = createMenuNavigation();
    const root = () => (card.value ? htmlRoot(card.value) : null);
    const entries = () => {
      const panel = root();
      return [
        ...(panel?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
      ].filter((item) => item.closest('[role="menu"]') === panel);
    };
    watch(
      [card, active, () => props.at],
      ([, live], _previous, cleanup) => {
        navigation.reset();
        if (!live) return;
        let current = true;
        void nextTick(() => {
          if (current && active.value)
            entries()
              .find((item) => item.getAttribute("aria-disabled") !== "true")
              ?.focus({ preventScroll: true });
        });
        cleanup(() => {
          current = false;
        });
      },
      { flush: "post" }
    );
    const keydown = (event: KeyboardEvent) => {
      const panel = root();
      if (
        !active.value ||
        !panel ||
        !(event.target instanceof Element) ||
        event.target.closest('[role="menu"]') !== panel
      )
        return;
      const items = entries();
      const action = navigation.key(
        event,
        items.map((item) => ({
          label: item.textContent ?? "",
          disabled: item.getAttribute("aria-disabled") === "true",
        })),
        items.findIndex((item) => item === panel.ownerDocument.activeElement)
      );
      if (!action) return;
      if (action.kind !== "close" || action.key !== "Tab")
        event.preventDefault();
      event.stopPropagation();
      if (action.kind === "close") props.onClose();
      else items[action.index]?.focus({ preventScroll: true });
    };
    return () => {
      const at = props.at;
      const close = () => {
        if (active.value && props.at === at) props.onClose();
      };
      return h(
        NPopover,
        {
          trigger: "manual",
          show: active.value,
          x: at.x,
          y: at.y,
          to: props.container ?? false,
          raw: true,
          showArrow: false,
          placement: "bottom-start",
          onClickoutside: close,
        },
        {
          default: () =>
            h(
              NCard,
              {
                ref: card,
                size: "small",
                role: "menu",
                tabindex: -1,
                "aria-label": props.label,
                "data-adapttable-part": "context-menu",
                class: ["adapttable-naive-context-menu", props.className],
                onKeydown: keydown,
                contentStyle: {
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                },
                style: {
                  maxWidth: "90vw",
                  maxHeight: "80dvh",
                  overflow: "auto",
                },
              },
              { default: () => props.children }
            ),
        }
      );
    };
  },
  {
    name: "NaiveContextMenuSurface",
    props: {
      at: {
        type: Object as PropType<ContextMenuSurfaceProps<VNodeChild>["at"]>,
      },
      anchorRef: {
        type: Object as PropType<
          ContextMenuSurfaceProps<VNodeChild>["anchorRef"]
        >,
      },
      label: {
        type: String as PropType<ContextMenuSurfaceProps<VNodeChild>["label"]>,
      },
      onClose: {
        type: Function as PropType<
          ContextMenuSurfaceProps<VNodeChild>["onClose"]
        >,
      },
      container: {
        type: Object as PropType<
          ContextMenuSurfaceProps<VNodeChild>["container"]
        >,
      },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          ContextMenuSurfaceProps<VNodeChild>["children"]
        >,
        default: undefined,
      },
      className: {
        type: String as PropType<
          ContextMenuSurfaceProps<VNodeChild>["className"]
        >,
      },
    },
  }
);
