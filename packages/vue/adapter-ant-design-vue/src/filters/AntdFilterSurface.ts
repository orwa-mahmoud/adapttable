import {
  type FilterPanelSurfaceProps,
  FULLSCREEN_MODEL,
  scheduleTick,
  useFeatureState,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Card, Drawer } from "ant-design-vue";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  onMounted,
  type PropType,
  shallowRef,
  watch,
} from "vue";

import { trapTab } from "../controls/focusTrap";
import {
  AntdAnchoredPopover,
  presentPopoverContent,
} from "../overlays/AnchoredPopover";
import { useOutsideDismiss } from "../overlays/outsideDismiss";
import { rtlScrollbarGutter } from "../scrollbarGutter";

/** Kit overlays retain their own positioning, motion and modal backdrop. */
const BACKDROP_ATTRS = { "data-adapttable-part": "filters-backdrop" };

export const AntdFilterSurface = defineComponent(
  (
    props: FilterPanelSurfaceProps & {
      readonly modal: boolean;
      readonly part?: string;
      /** Class for the drawer's backdrop (its modal mask). */
      readonly backdropClassName?: string;
    }
  ) => {
    const mounted = shallowRef(false);
    const active = useScopeActivity();
    const fullscreen = useFeatureState(FULLSCREEN_MODEL);
    const panel = shallowRef<ComponentPublicInstance>();
    onMounted(() => {
      mounted.value = true;
    });
    const close: FilterPanelSurfaceProps["onClose"] = (reason) => {
      if (!active.value || !props.open) return;
      props.onClose(reason);
    };
    // Ant Design Vue neither hands focus back to the opener nor remembers it,
    // so a panel that closes while holding focus returns it to the anchor.
    watch(
      () => props.open,
      (open, wasOpen) => {
        if (open || !wasOpen) return;
        const element = panelElement();
        const focused = element?.ownerDocument.activeElement ?? null;
        const held =
          !focused ||
          element?.contains(focused) === true ||
          focused.matches("body") ||
          focused === element?.closest(".ant-drawer");
        const anchor = props.anchor;
        if (!held) return;
        scheduleTick(() => {
          const now = anchor?.ownerDocument.activeElement ?? null;
          if (
            active.value &&
            !props.open &&
            props.anchor === anchor &&
            anchor?.isConnected &&
            (now == null ||
              now === anchor.ownerDocument.body ||
              !now.isConnected ||
              (element?.contains(now) ?? false) ||
              (now instanceof Element && !!now.closest(".ant-drawer")))
          )
            anchor.focus();
        });
      },
      { flush: "sync" }
    );
    // The drawer renders its own mask and forwards no attribute to it, so the
    // backdrop takes its part name and class once it is in the document.
    const markBackdrop = (element: Element) => {
      const mask = element
        .closest(".ant-drawer")
        ?.querySelector(".ant-drawer-mask");
      if (!mask) return;
      for (const [name, value] of Object.entries(BACKDROP_ATTRS))
        mask.setAttribute(name, value);
      if (props.backdropClassName)
        mask.classList.add(
          ...props.backdropClassName.split(/\s+/).filter(Boolean)
        );
    };
    const setPanel = (instance: unknown) => {
      panel.value = (instance as ComponentPublicInstance | null) ?? undefined;
      const element: unknown = panel.value?.$el;
      if (element instanceof Element) {
        presentPopoverContent(element);
        markBackdrop(element);
      }
      if (instance) scheduleTick(focusPanel);
    };
    const panelElement = (): HTMLElement | null => {
      const element: unknown = panel.value?.$el;
      return element instanceof HTMLElement ? element : null;
    };
    const keydown = (event: KeyboardEvent) => {
      const element = panelElement();
      if (props.modal && element && trapTab(event, element)) return;
      if (event.key !== "Escape") return;
      // A nested overlay or an IME composition owns its own Escape, so the
      // panel keeps those inside itself.
      if (event.defaultPrevented || event.isComposing) {
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      close("escape");
    };
    // Escape also dismisses while focus is still on the external trigger,
    // before the enter transition has moved it into the card.
    watch(
      () => active.value && props.open,
      (open, _previous, cleanup) => {
        const document = props.anchor?.ownerDocument;
        if (!open || !document) return;
        document.addEventListener("keydown", keydown);
        cleanup(() => document.removeEventListener("keydown", keydown));
      },
      { immediate: true }
    );
    // The popover has no backdrop, so a press elsewhere on the page closes it.
    useOutsideDismiss(
      () => active.value && props.open && !props.modal,
      () => props.anchor?.ownerDocument,
      () => [panelElement(), props.anchor],
      () => close("outside")
    );
    // A closed native combobox must not swallow the containing overlay's Escape.
    // Open comboboxes keep the event so their own menu closes first.
    const captureKeydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.getAttribute("role") === "combobox" &&
        target.getAttribute("aria-expanded") !== "true"
      )
        keydown(event);
    };
    const focusPanel = () => {
      const element = panelElement();
      if (!active.value || !props.open || !element) return;
      const focused = element.ownerDocument.activeElement;
      if (
        focused === props.anchor ||
        focused === element.ownerDocument.body ||
        focused === element.closest(".ant-drawer")
      )
        element.focus({ preventScroll: true });
    };
    const container = () =>
      props.container ?? fullscreen.value?.container ?? undefined;
    return () => {
      if (!mounted.value || !active.value) return null;
      if (props.modal)
        return h(
          Drawer,
          {
            open: props.open,
            placement: props.dir === "rtl" ? "left" : "right",
            // Relative to the drawer's overlay, which excludes a classic
            // scrollbar or a reserved gutter; 100vw does not.
            width: "min(30rem, 100%)",
            mask: true,
            maskClosable: true,
            keyboard: true,
            closable: false,
            destroyOnClose: true,
            bodyStyle: { padding: 0 },
            getContainer: () =>
              container() ?? props.anchor?.ownerDocument.body ?? document.body,
            // The drawer forwards no attribute, so its root carries only the
            // classes; the dialog itself is the card inside the side panel.
            rootClassName: "adapttable-ant-design-vue-filter-drawer",
            afterOpenChange: (open: boolean) => {
              if (open) focusPanel();
            },
            onClose: (event?: Event) =>
              close(event?.type === "keydown" ? "escape" : "outside"),
          },
          {
            default: () =>
              h(
                Card,
                {
                  ref: setPanel,
                  role: "dialog",
                  "aria-modal": "true",
                  dir: props.dir,
                  tabindex: -1,
                  "aria-label": props.label,
                  "data-adapttable-part": props.part ?? "filters-panel",
                  class: [
                    "adapttable-ant-design-vue-drawer-card",
                    props.className,
                  ],
                  bordered: false,
                  onKeydown: keydown,
                  onKeydownCapture: captureKeydown,
                },
                { default: () => props.children }
              ),
          }
        );
      return h(
        AntdAnchoredPopover,
        {
          open: props.open,
          anchor: props.anchor,
          container: container(),
          placement: props.dir === "rtl" ? "bottomRight" : "bottomLeft",
          overlayClass: "adapttable-ant-design-vue-filter-popover",
          overlayStyle: {
            width: "min(28rem, calc(100vw - 1rem))",
            translate: `${rtlScrollbarGutter(props.dir, props.anchor?.ownerDocument.defaultView)} 0`,
          },
          afterOpen: focusPanel,
        },
        {
          default: () =>
            h(
              Card,
              {
                ref: setPanel,
                role: "dialog",
                dir: props.dir,
                tabindex: -1,
                "aria-label": props.label,
                "data-adapttable-part": props.part ?? "filters-popover",
                class: props.className,
                onKeydown: keydown,
                onKeydownCapture: captureKeydown,
              },
              { default: () => props.children }
            ),
        }
      );
    };
  },
  {
    name: "AntdFilterSurface",
    props: {
      className: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["className"]
        >,
      },
      open: {
        type: Boolean as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["open"]
        >,
        default: undefined,
      },
      label: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["label"]
        >,
      },
      dir: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["dir"]
        >,
      },
      anchor: {
        type: Object as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["anchor"]
        >,
      },
      container: {
        type: Object as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["container"]
        >,
      },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["children"]
        >,
        default: undefined,
      },
      onClose: {
        type: Function as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["onClose"]
        >,
      },
      modal: {
        type: Boolean as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["modal"]
        >,
        default: undefined,
      },
      part: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["part"]
        >,
      },
      backdropClassName: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for the drawer's backdrop (its modal mask). */
            readonly backdropClassName?: string;
          })["backdropClassName"]
        >,
      },
    },
  }
);
