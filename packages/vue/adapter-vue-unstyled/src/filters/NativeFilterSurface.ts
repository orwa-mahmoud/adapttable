import {
  type FilterPanelSurfaceProps,
  resolveLabels,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  type CSSProperties,
  defineComponent,
  h,
  nextTick,
  onMounted,
  shallowRef,
  Teleport,
  watch,
} from "vue";

import { useClassNames } from "../classNamesContext";
import NativeFilterDialog from "./NativeFilterDialog.vue";

function focusInitialControl(root: HTMLElement): void {
  const current = root.ownerDocument.activeElement;
  if (current !== root && root.contains(current)) return;
  const control = [
    ...root.querySelectorAll<HTMLElement>(
      "input:not([type='hidden']), select, button, [tabindex='0']"
    ),
  ].find(
    (element) =>
      !element.matches(":disabled") &&
      element.getAttribute("aria-disabled") !== "true" &&
      !element.closest("[hidden], [inert]")
  );
  (control ?? root).focus();
}

function ownsClosingFocus(
  root: HTMLElement,
  focused: Element | null,
  owned: Element | null
): boolean {
  return (
    root.contains(focused) ||
    (focused === root.ownerDocument.body &&
      owned !== null &&
      (!owned.isConnected || owned.matches(":disabled")))
  );
}

/** Native popover and modal dialog own their top layer, focus and dismissal. */
export const NativeFilterSurface = defineComponent(
  (
    props: FilterPanelSurfaceProps & {
      readonly modal: boolean;
      readonly part?: string;
      readonly backdropLabel?: string;
    }
  ) => {
    const names = useClassNames();
    const active = useScopeActivity();
    const surface = shallowRef<HTMLElement | null>(null);
    const panel = shallowRef<HTMLElement | null>(null);
    const mounted = shallowRef(false);
    const position = shallowRef<CSSProperties>({});
    let focusRequest = 0;
    let surfaceLifetime = 0;
    let backdropPointerLifetime: number | undefined;
    let closeRequest: number | undefined;
    let closingFocus: Element | null | undefined;
    let closeReason: "escape" | "outside" | "done" | undefined;
    watch(
      [active, () => props.anchor, () => props.modal, () => props.open],
      ([ready, anchor, modal, open], previous) => {
        if (!open && previous[3])
          closingFocus = surface.value?.ownerDocument.activeElement;
        else if (open) closingFocus = undefined;
        if (
          open ||
          ready !== previous[0] ||
          anchor !== previous[1] ||
          modal !== previous[2]
        ) {
          focusRequest++;
          surfaceLifetime++;
          backdropPointerLifetime = undefined;
        }
      },
      { flush: "sync" }
    );
    const dismiss: FilterPanelSurfaceProps["onClose"] = (reason) => {
      if (!active.value) return;
      const request = ++focusRequest;
      closeRequest = request;
      closeReason = reason;
      props.onClose(reason);
      void nextTick(() => {
        if (props.open && closeRequest === request) {
          closeRequest = undefined;
          closeReason = undefined;
        }
      });
    };
    const restoreSurfaceFocus = (
      dialog: HTMLDialogElement | undefined,
      focused: Element | null,
      previous: Element | null,
      modal: boolean
    ) => {
      const request = focusRequest;
      const anchor = props.anchor;
      void nextTick(() => {
        if (
          request !== focusRequest ||
          !active.value ||
          props.modal !== modal ||
          props.open ||
          dialog?.open ||
          props.anchor !== anchor ||
          !anchor?.isConnected
        )
          return;
        const document = anchor.ownerDocument;
        const current = document.activeElement;
        if (
          current === focused ||
          current === previous ||
          current === anchor ||
          current === document.body ||
          !current
        )
          anchor.focus();
      });
    };
    onMounted(() => {
      mounted.value = true;
    });
    watch(
      [
        active,
        surface,
        () => props.open,
        () => props.modal,
        () => props.dir,
        () => props.anchor,
      ],
      ([ready, element, open], _old, cleanup) => {
        if (!ready || !element || !open) return;
        const modal = props.modal;
        const document = element.ownerDocument;
        const window = document.defaultView;
        if (!window) return;
        const place = () => {
          if (!active.value) return;
          if (props.modal) {
            position.value = {};
            return;
          }
          const bounds = props.anchor?.getBoundingClientRect();
          if (!bounds) return;
          const rect = element.getBoundingClientRect();
          const gap = 8;
          const left =
            props.dir === "rtl" ? bounds.right - rect.width : bounds.left;
          const below = bounds.bottom + gap;
          const top =
            below + rect.height <= window.innerHeight - gap
              ? below
              : Math.max(gap, bounds.top - rect.height - gap);
          position.value = {
            left: `${Math.max(gap, Math.min(left, window.innerWidth - rect.width - gap))}px`,
            top: `${top}px`,
          };
        };
        const dialog =
          element instanceof HTMLDialogElement ? element : undefined;
        const previousDialogFocus = document.activeElement;
        closeReason = undefined;
        closeRequest = undefined;
        if (props.modal && dialog?.showModal) dialog.showModal();
        else if (!props.modal && element.showPopover) element.showPopover();
        else element.setAttribute("open", "");
        place();
        if (modal && panel.value) focusInitialControl(panel.value);
        if (!modal && element.isConnected) focusInitialControl(element);
        let ownedFocus = element.contains(document.activeElement)
          ? document.activeElement
          : null;
        const trackFocus = (event: FocusEvent) => {
          const target = event.target;
          ownedFocus =
            target instanceof Element && element.contains(target)
              ? target
              : null;
        };
        const outside = (event: PointerEvent) => {
          focusRequest++;
          backdropPointerLifetime = undefined;
          if (!active.value) return;
          const target = event.target;
          if (
            target instanceof Node &&
            !element.contains(target) &&
            !props.anchor?.contains(target)
          )
            dismiss("outside");
        };
        const key = (event: KeyboardEvent) => {
          focusRequest++;
          if (
            active.value &&
            event.key === "Escape" &&
            !event.defaultPrevented
          ) {
            event.preventDefault();
            event.stopPropagation();
            dismiss("escape");
          }
        };
        document.addEventListener("pointerdown", outside, true);
        document.addEventListener("keydown", key, true);
        document.addEventListener("focusin", trackFocus, true);
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        const observer = window.ResizeObserver
          ? new window.ResizeObserver(place)
          : undefined;
        observer?.observe(element);
        cleanup(() => {
          document.removeEventListener("pointerdown", outside, true);
          document.removeEventListener("keydown", key, true);
          document.removeEventListener("focusin", trackFocus, true);
          window.removeEventListener("resize", place);
          window.removeEventListener("scroll", place, true);
          observer?.disconnect();
          const focused = closingFocus ?? document.activeElement;
          const restore =
            !props.open &&
            active.value &&
            closeReason !== "outside" &&
            (closeRequest === undefined || closeRequest === focusRequest) &&
            ownsClosingFocus(element, focused, ownedFocus);
          if (modal && dialog?.open && dialog.close) dialog.close();
          else if (!modal && element.hidePopover && element.isConnected)
            element.hidePopover();
          element.removeAttribute("open");
          if (restore)
            restoreSurfaceFocus(dialog, focused, previousDialogFocus, modal);
        });
      },
      { flush: "post" }
    );
    const cancel = (event: Event) => {
      event.preventDefault();
      if (active.value) dismiss("escape");
    };
    const partName = () =>
      props.part ?? (props.modal ? "filters-panel" : "filters-popover");
    const modalSurface = () => {
      const lifetime = surfaceLifetime;
      const current = () =>
        active.value &&
        props.open &&
        props.modal &&
        lifetime === surfaceLifetime;
      return h(NativeFilterDialog, {
        active: active.value,
        dir: props.dir,
        label: props.label,
        backdropLabel: props.backdropLabel ?? resolveLabels(undefined).cancel,
        part: partName(),
        panelClassName: props.className ?? names.value.filtersPanel,
        drawerClassName: names.value.filtersDrawer,
        backdropClassName: names.value.filtersBackdrop,
        children: props.children,
        hostRef: (element: HTMLElement | null) => {
          surface.value = element;
        },
        panelRef: (element: HTMLElement | null) => {
          panel.value = element;
        },
        onCancel: (event: Event) => {
          event.preventDefault();
          if (current()) dismiss("escape");
        },
        onBackdropPointerDown: () => {
          if (current()) backdropPointerLifetime = lifetime;
        },
        onBackdropPointerCancel: () => {
          if (current()) backdropPointerLifetime = undefined;
        },
        onBackdropClick: (event: MouseEvent) => {
          const beganHere =
            event.detail === 0 || backdropPointerLifetime === lifetime;
          backdropPointerLifetime = undefined;
          if (current() && beganHere) dismiss("outside");
        },
      });
    };
    const popoverSurface = () =>
      h(
        "div",
        {
          ref: surface,
          hidden: !active.value,
          inert: !active.value,
          "aria-hidden": !active.value || undefined,
          dir: props.dir,
          role: "dialog",
          popover: "manual",
          tabindex: -1,
          "aria-label": props.label,
          class: props.className ?? names.value.filtersPopover,
          "data-adapttable-part": partName(),
          style: {
            display: active.value ? undefined : "none !important",
            boxSizing: "border-box",
            position: "fixed",
            maxInlineSize: "calc(100vw - 16px)",
            maxBlockSize: "calc(100dvh - 16px)",
            overflow: "auto",
            margin: 0,
            inset: "auto",
            inlineSize: "22rem",
            zIndex: 1000,
            ...position.value,
          },
          onCancel: cancel,
        },
        [props.children]
      );
    return () =>
      props.open && mounted.value
        ? h(Teleport, { to: props.container ?? "body" }, [
            props.modal ? modalSurface() : popoverSurface(),
          ])
        : null;
  },
  {
    name: "NativeFilterSurface",
    props: [
      "open",
      "label",
      "dir",
      "anchor",
      "children",
      "onClose",
      "modal",
      "part",
      "backdropLabel",
      "container",
      "className",
    ],
  }
);
