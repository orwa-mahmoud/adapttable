import {
  type FilterPanelSurfaceProps,
  type OverlayCloseReason,
  useDataTableClassNames,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { NDrawer, NDrawerContent, NPopover } from "naive-ui";
import {
  defineComponent,
  h,
  type HTMLAttributes,
  nextTick,
  onMounted,
  type PropType,
  shallowRef,
  watch,
} from "vue";

import { naiveClassNames } from "../classNames";

/** Public vendor surfaces own their mask, trap, scroll lock and portal. */
export const NaiveFilterSurface = defineComponent(
  (
    props: FilterPanelSurfaceProps & {
      readonly modal: boolean;
      readonly part?: string;
    }
  ) => {
    const names = useDataTableClassNames();
    const active = useScopeActivity();
    const mounted = shallowRef(false);
    const content = shallowRef<HTMLElement | null>(null);
    const position = shallowRef<{ x: number; y: number; maxHeight: number }>();
    let lifetime = 0;
    let reason: OverlayCloseReason | undefined;
    const dismiss = (
      why: OverlayCloseReason,
      ticket: number,
      owner: FilterPanelSurfaceProps["onClose"]
    ) => {
      if (
        ticket !== lifetime ||
        !active.value ||
        !props.open ||
        owner !== props.onClose
      )
        return;
      reason = why;
      owner(why);
    };
    onMounted(() => {
      mounted.value = true;
    });

    watch(
      [
        active,
        () => props.open,
        () => props.anchor,
        () => props.modal,
        () => props.onClose,
      ],
      ([enabled, open, anchor, modal], previous) => {
        const ticket = ++lifetime;
        const surface = content.value;
        const focused = surface?.ownerDocument.activeElement;
        if (
          !modal &&
          enabled &&
          !open &&
          previous[1] &&
          reason !== "outside" &&
          surface &&
          focused &&
          surface.contains(focused) &&
          anchor?.isConnected
        ) {
          void nextTick(() => {
            const current = anchor.ownerDocument.activeElement;
            if (
              ticket === lifetime &&
              active.value &&
              !props.open &&
              props.anchor === anchor &&
              anchor.isConnected &&
              (current === focused || current === anchor.ownerDocument.body)
            ) {
              anchor.focus();
            }
          });
        }
        reason = undefined;
      },
      { flush: "sync" }
    );

    watch(
      [
        mounted,
        active,
        () => props.open,
        () => props.anchor,
        () => props.dir,
        () => props.modal,
        () => props.onClose,
      ],
      ([ready, enabled, open, anchor, dir, modal], _previous, cleanup) => {
        if (!ready || !enabled || !open || !anchor || modal) return;
        const view = anchor.ownerDocument.defaultView;
        if (!view) return;
        const place = () => {
          const rect = anchor.getBoundingClientRect();
          position.value = {
            x: dir === "rtl" ? rect.right : rect.left,
            y: rect.bottom,
            maxHeight: Math.max(
              0,
              Math.min(
                560,
                Math.max(rect.top, view.innerHeight - rect.bottom) - 8
              )
            ),
          };
        };
        place();
        const ticket = lifetime;
        const owner = props.onClose;
        const keydown = (event: KeyboardEvent) => {
          if (
            event.key !== "Escape" ||
            event.defaultPrevented ||
            event.isComposing
          )
            return;
          const target = event.target;
          const dialog =
            target instanceof Element
              ? target.closest('[role="dialog"]')
              : null;
          if (dialog && dialog !== content.value?.closest('[role="dialog"]'))
            return;
          event.preventDefault();
          dismiss("escape", ticket, owner);
        };
        anchor.ownerDocument.addEventListener("keydown", keydown);
        view.addEventListener("resize", place);
        view.addEventListener("scroll", place, true);
        const observer = view.ResizeObserver
          ? new view.ResizeObserver(place)
          : undefined;
        observer?.observe(anchor);
        cleanup(() => {
          anchor.ownerDocument.removeEventListener("keydown", keydown);
          view.removeEventListener("resize", place);
          view.removeEventListener("scroll", place, true);
          observer?.disconnect();
        });
      },
      { flush: "post" }
    );

    watch(
      [content, active, () => props.open, () => props.modal],
      ([element, enabled, open, modal]) => {
        if (
          !element ||
          !enabled ||
          !open ||
          modal ||
          element.contains(element.ownerDocument.activeElement)
        )
          return;
        const target = [
          ...element.querySelectorAll<HTMLElement>(
            "input:not([type='hidden']), select, button, [tabindex='0']"
          ),
        ].find(
          (node) =>
            !node.matches(":disabled") &&
            node.getAttribute("aria-disabled") !== "true" &&
            !node.closest("[hidden], [inert]")
        );
        (target ?? element).focus({ preventScroll: true });
      },
      { flush: "post" }
    );

    return () => {
      const classes = naiveClassNames(names.value);
      const ticket = lifetime;
      const requestClose = props.onClose;
      const current = () => ticket === lifetime && active.value && props.open;
      const close = (why: OverlayCloseReason) => {
        dismiss(why, ticket, requestClose);
      };
      const open = mounted.value && active.value && props.open;
      const children = () =>
        h("div", { ref: content, tabindex: -1 }, [props.children]);
      const keydown = (event: KeyboardEvent) => {
        if (
          event.key !== "Escape" ||
          event.defaultPrevented ||
          event.isComposing ||
          !current()
        )
          return;
        if (props.modal) {
          // NDrawer's public update event follows its own topmost focus-trap check.
          reason = "escape";
          void nextTick(() => {
            if (ticket === lifetime) reason = undefined;
          });
        } else {
          event.preventDefault();
          event.stopPropagation();
          close("escape");
        }
      };
      const attrs: HTMLAttributes & { "data-adapttable-part": string } = {
        dir: props.dir,
        role: "dialog",
        "aria-label": props.label,
        "data-adapttable-part":
          props.part ?? (props.modal ? "filters-panel" : "filters-popover"),
        class: [
          "adapttable-naive-filter-surface",
          props.className ??
            (props.modal ? classes.filtersPanel : classes.filtersPopover),
        ],
        onKeydown: keydown,
      };
      if (props.modal) {
        return h(
          NDrawer,
          {
            ...attrs,
            class: [attrs.class, classes.filtersDrawer],
            show: open,
            to: props.container ?? undefined,
            placement: props.dir === "rtl" ? "left" : "right",
            width: "min(24rem, calc(100vw - 16px))",
            "onUpdate:show": (show: boolean) => {
              if (!show) close(reason ?? "outside");
            },
          },
          { default: () => h(NDrawerContent, {}, { default: children }) }
        );
      }
      // Manual positioning requires both public coordinates before first render.
      if (!mounted.value || !props.anchor || !position.value) return null;
      return h(
        NPopover,
        {
          ...attrs,
          trigger: "manual",
          show: open && !!props.anchor && !!position.value,
          x: position.value?.x,
          y: position.value?.y,
          to: props.container ?? undefined,
          placement: props.dir === "rtl" ? "bottom-end" : "bottom-start",
          showArrow: false,
          style: {
            boxSizing: "border-box",
            width: "22rem",
            maxWidth: "calc(100vw - 16px)",
            maxHeight: `${position.value.maxHeight}px`,
            overflow: "auto",
          },
          onClickoutside: (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Node) || !props.anchor?.contains(target))
              close("outside");
          },
        },
        { default: children }
      );
    };
  },
  {
    name: "NaiveFilterSurface",
    props: {
      open: {
        type: Boolean as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["open"]
        >,
        default: undefined,
      },
      label: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["label"]
        >,
      },
      dir: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["dir"]
        >,
      },
      anchor: {
        type: Object as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["anchor"]
        >,
      },
      container: {
        type: Object as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["container"]
        >,
      },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["children"]
        >,
        default: undefined,
      },
      onClose: {
        type: Function as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["onClose"]
        >,
      },
      className: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["className"]
        >,
      },
      modal: {
        type: Boolean as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["modal"]
        >,
        default: undefined,
      },
      part: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
          })["part"]
        >,
      },
    },
  }
);
