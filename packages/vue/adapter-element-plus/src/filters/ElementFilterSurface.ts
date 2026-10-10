import {
  type FilterPanelSurfaceProps,
  FULLSCREEN_MODEL,
  useFeatureState,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  type CardInstance,
  ClickOutside,
  ElCard,
  ElDrawer,
  ElPopover,
} from "element-plus";
import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  type PropType,
  shallowRef,
  withDirectives,
} from "vue";

/** Kit overlays retain their own positioning, focus trap and modal backdrop. */
export const ElementFilterSurface = defineComponent(
  (
    props: FilterPanelSurfaceProps & {
      readonly modal: boolean;
      readonly part?: string;
      /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
      readonly backdropClassName?: string;
    }
  ) => {
    const mounted = shallowRef(false);
    const active = useScopeActivity();
    const fullscreen = useFeatureState(FULLSCREEN_MODEL);
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
      if (event.key !== "Escape") return;
      // Element's focus trap releases on any Escape that reaches the document,
      // including one an inner control handled or an IME composition owns, so
      // the panel keeps those Escapes inside itself.
      if (event.defaultPrevented || event.isComposing) {
        event.stopPropagation();
        return;
      }
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
      if (!active.value || !props.open || !(element instanceof HTMLElement))
        return;
      const focused = element.ownerDocument.activeElement;
      if (focused === props.anchor || focused === element.ownerDocument.body)
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
            appendTo: props.container ?? fullscreen.value?.container ?? "body",
            appendToBody: true,
            modal: true,
            modalClass: props.backdropClassName,
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
          appendTo: props.container ?? fullscreen.value?.container ?? "body",
          teleported: true,
          persistent: false,
          showArrow: false,
          width: "min(28rem, calc(100vw - 1rem))",
          popperClass: "adapttable-element-plus-filter-popover",
          popperStyle: { padding: 0 },
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
    props: {
      className: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
            readonly backdropClassName?: string;
          })["className"]
        >,
      },
      open: {
        type: Boolean as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
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
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
            readonly backdropClassName?: string;
          })["label"]
        >,
      },
      dir: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
            readonly backdropClassName?: string;
          })["dir"]
        >,
      },
      anchor: {
        type: Object as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
            readonly backdropClassName?: string;
          })["anchor"]
        >,
      },
      container: {
        type: Object as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
            readonly backdropClassName?: string;
          })["container"]
        >,
      },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
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
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
            readonly backdropClassName?: string;
          })["onClose"]
        >,
      },
      modal: {
        type: Boolean as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
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
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
            readonly backdropClassName?: string;
          })["part"]
        >,
      },
      backdropClassName: {
        type: String as PropType<
          (FilterPanelSurfaceProps & {
            readonly modal: boolean;
            readonly part?: string;
            /** Class for ElDrawer's modal mask, through its `modalClass` hook. */
            readonly backdropClassName?: string;
          })["backdropClassName"]
        >,
      },
    },
  }
);
