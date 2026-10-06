import {
  type FilterPanelSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  ClickOutside,
  ElCard,
  ElDrawer,
  ElPopover,
  type CardInstance,
} from "element-plus";
import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  shallowRef,
  withDirectives,
} from "vue";

/** Kit overlays retain their own positioning, focus trap and modal backdrop. */
export const ElementFilterSurface = defineComponent(
  (
    props: FilterPanelSurfaceProps & {
      readonly modal: boolean;
      readonly part?: string;
    }
  ) => {
    const mounted = shallowRef(false);
    const active = useScopeActivity();
    const panel = shallowRef<CardInstance>();
    onMounted(() => {
      mounted.value = true;
    });
    const close: FilterPanelSurfaceProps["onClose"] = (reason) => {
      if (!active.value || !props.open) return;
      props.onClose(reason);
      if (reason === "escape") {
        const anchor = props.anchor;
        void nextTick(() => {
          if (
            active.value &&
            !props.open &&
            props.anchor === anchor &&
            anchor?.isConnected
          )
            anchor.focus();
        });
      }
    };
    const outside = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && props.anchor?.contains(target)) return;
      close("outside");
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing)
        return;
      event.preventDefault();
      event.stopPropagation();
      close("escape");
    };
    // A closed native combobox must not swallow the containing overlay's Escape.
    // Open comboboxes keep the event so their own menu closes first.
    const captureKeydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.getAttribute("role") === "combobox" &&
        target.getAttribute("aria-expanded") === "false"
      )
        keydown(event);
    };
    const focusPanel = () => {
      const element: unknown = panel.value?.$el;
      if (active.value && props.open && element instanceof HTMLElement)
        element.focus();
    };
    return () => {
      if (!mounted.value || !active.value) return null;
      if (props.modal)
        return h(
          ElDrawer,
          {
            modelValue: props.open,
            title: props.label,
            direction: props.dir === "rtl" ? "ltr" : "rtl",
            appendTo: props.container ?? "body",
            appendToBody: true,
            modal: true,
            withHeader: false,
            showClose: false,
            destroyOnClose: true,
            size: "min(30rem, 100vw)",
            dir: props.dir,
            class: props.className,
            "data-adapttable-part": "filters-panel",
            beforeClose: () => close("outside"),
            onKeydown: keydown,
            onKeydownCapture: captureKeydown,
          },
          { default: () => props.children }
        );
      if (!props.anchor) return null;
      return h(
        ElPopover,
        {
          visible: props.open,
          virtualTriggering: true,
          virtualRef: props.anchor,
          trigger: "click",
          role: "dialog",
          "aria-label": props.label,
          placement: props.dir === "rtl" ? "bottom-end" : "bottom-start",
          appendTo: props.container ?? "body",
          teleported: true,
          persistent: false,
          showArrow: false,
          width: "min(28rem, calc(100vw - 1rem))",
          popperClass: "adapttable-element-plus-filter-popover",
          popperStyle: { padding: 0, zIndex: 3000 },
          onAfterEnter: focusPanel,
        },
        {
          default: () =>
            withDirectives(
              h(
                ElCard,
                {
                  ref: panel,
                  shadow: "never",
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
              [[ClickOutside, outside]]
            ),
        }
      );
    };
  },
  {
    name: "ElementFilterSurface",
    props: [
      "className",
      "open",
      "label",
      "dir",
      "anchor",
      "container",
      "children",
      "onClose",
      "modal",
      "part",
    ],
  }
);
