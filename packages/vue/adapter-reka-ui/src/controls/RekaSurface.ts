import type { Attrs } from "@adapttable/vue";
import {
  type FilterPanelSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  ConfigProvider,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  Primitive,
} from "reka-ui";
import { defineComponent, h, mergeProps, type PropType, watch } from "vue";

import { useTargetAttrs } from "./target";

type SurfaceProps = FilterPanelSurfaceProps & {
  readonly modal: boolean;
  readonly part?: string;
  readonly backdropClassName?: string;
  readonly drawerClassName?: string;
  readonly contentAttrs?: Attrs;
  readonly isCurrent?: () => boolean;
};

/** Reka owns collision placement, focus trapping, dismissal and portal lifetime. */
export const RekaSurface = defineComponent(
  (props: SurfaceProps) => {
    const active = useScopeActivity();
    const targetAttrs = useTargetAttrs(() => props.contentAttrs ?? {});
    let reason: "escape" | "outside" | "done" = "done";
    let openingAnchor = props.anchor;
    watch(
      () => props.open,
      (open) => {
        if (open) {
          reason = "done";
          openingAnchor = props.anchor;
        }
      },
      { flush: "sync" }
    );
    const changed = (open: boolean) => {
      if (!open && active.value && (props.isCurrent?.() ?? true))
        props.onClose(reason);
    };
    const closeAutoFocus = (event: Event) => {
      event.preventDefault();
      // Managed Chrome's guard survives accepted panel removal, but not owner
      // replacement/disposal. Direct filter surfaces remain mounted on close.
      const current = props.isCurrent
        ? props.isCurrent()
        : active.value && !props.open;
      if (
        current &&
        reason !== "outside" &&
        openingAnchor === props.anchor &&
        openingAnchor?.isConnected
      )
        openingAnchor.focus();
    };
    const pointerDownOutside = (
      event: CustomEvent<{ originalEvent: PointerEvent }>
    ) => {
      const target = event.detail.originalEvent.target;
      if (target instanceof Node && props.anchor?.contains(target)) {
        event.preventDefault();
        return;
      }
      reason = "outside";
    };
    const contentProps = () =>
      mergeProps(targetAttrs(), {
        dir: props.dir,
        "aria-label": props.label,
        "aria-describedby": undefined,
        "data-adapttable-part":
          props.part ?? (props.modal ? "filters-panel" : "filters-popover"),
        class: [
          "at-reka-surface",
          props.modal ? "at-reka-drawer-panel" : "at-reka-popover",
          props.className,
          props.modal ? props.drawerClassName : undefined,
        ],
        onEscapeKeyDown: () => {
          reason = "escape";
        },
        onClickCapture: () => {
          reason = "done";
        },
        onPointerDownOutside: pointerDownOutside,
        onCloseAutoFocus: closeAutoFocus,
      });
    const modalChildren = () => [
      h(
        DialogTitle,
        { class: "at-reka-visually-hidden" },
        { default: () => props.label }
      ),
      props.children,
    ];
    const dialogPanel = () =>
      h(DialogContent, contentProps(), { default: modalChildren });
    const modalPortal = () =>
      h(
        DialogPortal,
        { to: props.container ?? "body" },
        {
          default: () => [
            h(DialogOverlay, {
              "data-adapttable-part": "filters-backdrop",
              class: ["at-reka-backdrop", props.backdropClassName],
            }),
            dialogPanel(),
          ],
        }
      );
    const modal = () =>
      h(
        DialogRoot,
        {
          open: props.open && active.value,
          modal: true,
          "onUpdate:open": changed,
        },
        { default: modalPortal }
      );
    const popoverContent = () => {
      const { ref } = targetAttrs();
      const attrs = contentProps();
      delete attrs.ref;
      return h(
        PopoverContent,
        {
          ...attrs,
          asChild: true,
          side: "bottom",
          align: "start",
          sideOffset: 8,
          collisionPadding: 8,
          onFocusOutside: (event: CustomEvent) => {
            if (!event.defaultPrevented) reason = "outside";
          },
        },
        {
          default: () =>
            h(Primitive, { as: "div", ref }, { default: () => props.children }),
        }
      );
    };
    const popoverChildren = () => [
      h(PopoverAnchor, {
        reference: props.anchor ?? undefined,
        as: "span",
        hidden: true,
      }),
      h(
        PopoverPortal,
        { to: props.container ?? "body" },
        { default: popoverContent }
      ),
    ];
    const popover = () =>
      h(
        PopoverRoot,
        {
          open: props.open && active.value,
          modal: false,
          "onUpdate:open": changed,
        },
        { default: popoverChildren }
      );
    return () =>
      h(
        ConfigProvider,
        { dir: props.dir },
        { default: () => (props.modal ? modal() : popover()) }
      );
  },
  {
    name: "RekaSurface",
    props: {
      open: {
        type: Boolean as PropType<SurfaceProps["open"]>,
        default: undefined,
      },
      label: { type: String as PropType<SurfaceProps["label"]> },
      dir: { type: String as PropType<SurfaceProps["dir"]> },
      anchor: { type: Object as PropType<SurfaceProps["anchor"]> },
      container: { type: Object as PropType<SurfaceProps["container"]> },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          SurfaceProps["children"]
        >,
        default: undefined,
      },
      onClose: { type: Function as PropType<SurfaceProps["onClose"]> },
      modal: {
        type: Boolean as PropType<SurfaceProps["modal"]>,
        default: undefined,
      },
      part: { type: String as PropType<SurfaceProps["part"]> },
      className: { type: String as PropType<SurfaceProps["className"]> },
      backdropClassName: {
        type: String as PropType<SurfaceProps["backdropClassName"]>,
      },
      drawerClassName: {
        type: String as PropType<SurfaceProps["drawerClassName"]>,
      },
      contentAttrs: { type: Object as PropType<SurfaceProps["contentAttrs"]> },
      isCurrent: { type: Function as PropType<SurfaceProps["isCurrent"]> },
    },
  }
);
