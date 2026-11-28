import type { Attrs } from "@adapttable/vue";
import {
  type FilterPanelSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  Dialog,
  DialogOverlay,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverPanel,
} from "@headlessui/vue";
import {
  defineComponent,
  h,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  type PropType,
  watch,
} from "vue";

import { useDismissLayer, usePlacement } from "./overlay";
import {
  headlessPortal,
  hostPortalRoot,
  useHeadlessPortalContainer,
} from "./portal";
import { singleHandlers, useTargetAttrs } from "./target";

type SurfaceProps = FilterPanelSurfaceProps & {
  readonly modal: boolean;
  readonly part?: string;
  readonly backdropClassName?: string;
  readonly drawerClassName?: string;
  readonly contentAttrs?: Attrs;
  readonly isCurrent?: () => boolean;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The filter popover and drawer. The drawer is a Headless UI Dialog with its
 * own backdrop. The popover is a Headless UI Popover panel with no backdrop;
 * its open state belongs to the host, so Escape, outside presses and focus
 * return are handled by {@link useDismissLayer}.
 */
export const HeadlessSurface = defineComponent(
  (props: SurfaceProps) => {
    const active = useScopeActivity();
    const targetAttrs = useTargetAttrs(() => props.contentAttrs ?? {});
    const panel = () => targetAttrs.element();
    let reason: "escape" | "outside" | "done" = "done";
    let openingAnchor = props.anchor;
    const shown = () => props.open && active.value;
    const changed = (open: boolean) => {
      if (!open && active.value && (props.isCurrent?.() ?? true))
        props.onClose(reason);
    };
    let wasShown = false;
    /**
     * Managed Chrome's guard survives accepted panel removal, but not owner
     * replacement/disposal. Direct filter surfaces remain mounted on close.
     */
    const restoreFocus = () => {
      if (!wasShown) return;
      wasShown = false;
      const current = props.isCurrent ? props.isCurrent() : active.value;
      const anchor = openingAnchor;
      void nextTick(() => {
        if (
          current &&
          reason !== "outside" &&
          anchor === props.anchor &&
          anchor?.isConnected
        )
          anchor.focus();
      });
    };
    onBeforeUnmount(restoreFocus);
    watch(
      shown,
      (open, wasOpen) => {
        if (open) {
          wasShown = true;
          reason = "done";
          openingAnchor = props.anchor;
          // Move focus into the panel, unless the host already did.
          void nextTick(() => {
            const element = panel();
            if (
              element &&
              !element.contains(element.ownerDocument.activeElement)
            )
              (element.querySelector<HTMLElement>(FOCUSABLE) ?? element).focus({
                preventScroll: true,
              });
          });
          return;
        }
        if (!wasOpen) return;
        restoreFocus();
      },
      { flush: "sync", immediate: true }
    );
    usePlacement(
      () => (props.modal ? null : panel()),
      () => props.anchor,
      () => props.dir
    );
    useDismissLayer({
      open: () => !props.modal && shown(),
      panel,
      anchor: () => props.anchor,
      onDismiss: (why) => {
        // A press on the trigger belongs to the trigger, not to dismissal.
        reason = why;
        changed(false);
      },
    });
    const contentProps = () =>
      singleHandlers(
        mergeProps(targetAttrs(), {
          ...(props.modal ? {} : { role: "dialog" }),
          dir: props.dir,
          "aria-label": props.label,
          "data-adapttable-part":
            props.part ?? (props.modal ? "filters-panel" : "filters-popover"),
          class: [
            "at-headless-surface",
            props.modal ? "at-headless-drawer-panel" : "at-headless-popover",
            props.className,
            props.modal ? props.drawerClassName : undefined,
          ],
          onClickCapture: () => {
            reason = "done";
          },
        })
      );
    const inherited = useHeadlessPortalContainer();
    const drawerOverlay = () =>
      h(DialogOverlay, {
        "data-adapttable-part": "filters-backdrop",
        class: ["at-headless-backdrop", props.backdropClassName],
        onPointerdownCapture: () => {
          reason = "outside";
        },
      });
    const drawerPanel = () =>
      h(DialogPanel, contentProps(), {
        default: () => [
          h(
            DialogTitle,
            { class: "at-headless-visually-hidden" },
            { default: () => props.label }
          ),
          props.children,
        ],
      });
    const drawer = () => {
      hostPortalRoot(props.container ?? inherited());
      return h(
        Dialog,
        {
          open: shown(),
          onClose: () => {
            if (reason !== "escape") reason = "outside";
            changed(false);
          },
        },
        { default: () => [drawerOverlay(), drawerPanel()] }
      );
    };
    const popoverPanel = () =>
      h(
        PopoverPanel,
        { static: true, ...contentProps() },
        { default: () => props.children }
      );
    const popover = () =>
      shown()
        ? headlessPortal(
            () => h(Popover, { as: "template" }, { default: popoverPanel }),
            props.container ?? undefined
          )
        : null;
    return () => (props.modal ? drawer() : popover());
  },
  {
    name: "HeadlessSurface",
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
