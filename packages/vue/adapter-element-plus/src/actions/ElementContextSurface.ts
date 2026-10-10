import {
  type ContextMenuSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  type DropdownInstance,
  ElDropdown,
  ElDropdownMenu,
} from "element-plus";
import {
  defineComponent,
  h,
  nextTick,
  onScopeDispose,
  type PropType,
  shallowRef,
  type VNodeChild,
  watch,
} from "vue";
/** The public dropdown API synchronizes the primitive with the binding's open session. */
export const ElementContextSurface = defineComponent(
  (
    props: ContextMenuSurfaceProps<VNodeChild> & {
      readonly dir?: "ltr" | "rtl";
    }
  ) => {
    const active = useScopeActivity();
    const control = shallowRef<DropdownInstance>();
    let live = true;
    let generation = 0;
    onScopeDispose(() => {
      live = false;
      generation++;
    });
    const virtualAnchor = {
      getBoundingClientRect: () => new DOMRect(props.at.x, props.at.y, 0, 0),
      get contextElement() {
        return props.anchorRef.current ?? undefined;
      },
    };
    watch(
      [active, () => props.at],
      () => {
        generation++;
      },
      { flush: "sync", immediate: true }
    );
    watch(
      [active, control, () => props.at],
      () => {
        const ticket = generation;
        void nextTick(() => {
          if (live && active.value && ticket === generation)
            control.value?.handleOpen();
          else if (!active.value) control.value?.handleClose();
        });
      },
      { flush: "post", immediate: true }
    );
    return () => {
      if (!active.value) return null;
      const at = props.at;
      const ticket = generation;
      const onClose = props.onClose;
      const isCurrent = () =>
        live &&
        active.value &&
        ticket === generation &&
        props.at === at &&
        props.onClose === onClose;
      return h(
        ElDropdown,
        {
          ref: control,
          virtualTriggering: true,
          virtualRef: virtualAnchor,
          trigger: "contextmenu",
          role: "menu",
          showTimeout: 0,
          hideTimeout: 0,
          hideOnClick: false,
          placement: "bottom-start",
          appendTo: props.container ?? "body",
          teleported: true,
          persistent: false,
          showArrow: false,
          maxHeight: "min(70vh, 32rem)",
          popperStyle: { maxWidth: "calc(100vw - 1rem)" },
          onVisibleChange: (visible: boolean) => {
            if (visible || !isCurrent()) return;
            onClose();
            // A rejected controlled close keeps the same native session open.
            void nextTick(() => {
              if (isCurrent()) control.value?.handleOpen();
            });
          },
        },
        {
          dropdown: () =>
            h(
              ElDropdownMenu,
              {
                "aria-label": props.label,
                class: props.className,
                dir: props.dir,
                "data-adapttable-part": "context-menu",
                onKeydown: (event: KeyboardEvent) => {
                  if (
                    !isCurrent() ||
                    event.key !== "Escape" ||
                    event.defaultPrevented ||
                    event.isComposing ||
                    !(event.target instanceof Element) ||
                    event.target.closest('[role="menu"]') !==
                      event.currentTarget
                  )
                    return;
                  event.preventDefault();
                  event.stopPropagation();
                  control.value?.handleClose();
                },
                onFocus: (event: FocusEvent) => {
                  if (
                    !isCurrent() ||
                    event.target !== event.currentTarget ||
                    !(event.currentTarget instanceof HTMLElement)
                  )
                    return;
                  event.currentTarget
                    .querySelector<HTMLElement>(
                      '[role="menuitem"]:not([aria-disabled="true"])'
                    )
                    ?.focus();
                },
              },
              { default: () => props.children }
            ),
        }
      );
    };
  },
  {
    name: "ElementContextSurface",
    props: {
      at: {
        type: Object as PropType<
          (ContextMenuSurfaceProps<VNodeChild> & {
            readonly dir?: "ltr" | "rtl";
          })["at"]
        >,
      },
      anchorRef: {
        type: Object as PropType<
          (ContextMenuSurfaceProps<VNodeChild> & {
            readonly dir?: "ltr" | "rtl";
          })["anchorRef"]
        >,
      },
      label: {
        type: String as PropType<
          (ContextMenuSurfaceProps<VNodeChild> & {
            readonly dir?: "ltr" | "rtl";
          })["label"]
        >,
      },
      onClose: {
        type: Function as PropType<
          (ContextMenuSurfaceProps<VNodeChild> & {
            readonly dir?: "ltr" | "rtl";
          })["onClose"]
        >,
      },
      container: {
        type: Object as PropType<
          (ContextMenuSurfaceProps<VNodeChild> & {
            readonly dir?: "ltr" | "rtl";
          })["container"]
        >,
      },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          (ContextMenuSurfaceProps<VNodeChild> & {
            readonly dir?: "ltr" | "rtl";
          })["children"]
        >,
        default: undefined,
      },
      className: {
        type: String as PropType<
          (ContextMenuSurfaceProps<VNodeChild> & {
            readonly dir?: "ltr" | "rtl";
          })["className"]
        >,
      },
      dir: {
        type: String as PropType<
          (ContextMenuSurfaceProps<VNodeChild> & {
            readonly dir?: "ltr" | "rtl";
          })["dir"]
        >,
      },
    },
  }
);
