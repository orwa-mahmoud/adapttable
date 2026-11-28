import {
  type ContextMenuSurfaceProps,
  scheduleTick,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Dropdown, Menu } from "ant-design-vue";
import {
  defineComponent,
  h,
  onScopeDispose,
  type PropType,
  shallowRef,
  type VNodeChild,
  watch,
} from "vue";

import { focusOnOpen, handleMenuKey } from "../controls/menuKeyboard";

/**
 * The public dropdown API synchronizes the primitive with the binding's open
 * session. The pointer position is a real, empty positioning host the dropdown
 * anchors to, so Ant Design Vue aligns, flips and closes the menu itself.
 */
export const AntdContextSurface = defineComponent(
  (
    props: ContextMenuSurfaceProps<VNodeChild> & {
      readonly dir?: "ltr" | "rtl";
    }
  ) => {
    const active = useScopeActivity();
    let live = true;
    let generation = 0;
    onScopeDispose(() => {
      live = false;
      generation++;
    });
    const open = shallowRef(true);
    let latest: () => boolean = () => false;
    const focusMenu = focusOnOpen(scheduleTick, () => latest());
    watch(
      [active, () => props.at],
      () => {
        generation++;
        open.value = true;
      },
      { flush: "sync", immediate: true }
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
      latest = isCurrent;
      const close = () => {
        if (!isCurrent()) return;
        onClose();
        // A rejected controlled close keeps the same session open.
        open.value = true;
      };
      return h(
        Dropdown,
        {
          open: open.value,
          trigger: ["contextmenu"],
          placement: "bottomLeft",
          destroyPopupOnHide: true,
          getPopupContainer: () =>
            props.container ??
            props.anchorRef.current?.ownerDocument.body ??
            document.body,
          overlayStyle: { maxWidth: "calc(100vw - 1rem)" },
          // Ant Design Vue reports a cached table's deactivation as a close,
          // before this scope learns it is inactive. Reading the session a
          // tick later lets that retire the request instead of sending it.
          onOpenChange: (visible: boolean) => {
            if (!visible) scheduleTick(close);
          },
        },
        {
          default: () =>
            h("span", {
              "aria-hidden": "true",
              "data-adapttable-part": "context-menu-anchor",
              style: {
                position: "fixed",
                insetInlineStart: `${at.x}px`,
                insetBlockStart: `${at.y}px`,
                inlineSize: 0,
                blockSize: 0,
                pointerEvents: "none",
              },
            }),
          overlay: () =>
            h(
              Menu,
              {
                "aria-label": props.label,
                class: props.className,
                dir: props.dir,
                selectable: false,
                "data-adapttable-part": "context-menu",
                ref: focusMenu,
                onKeydown: (event: KeyboardEvent) => {
                  if (isCurrent() && handleMenuKey(event)) return;
                  const menu = event.currentTarget;
                  const target = event.target;
                  if (
                    !isCurrent() ||
                    event.key !== "Escape" ||
                    event.defaultPrevented ||
                    event.isComposing ||
                    // A submenu keeps the Escape that closes itself.
                    (target instanceof Element &&
                      target.closest('[role="menu"]') !== menu)
                  )
                    return;
                  event.preventDefault();
                  event.stopPropagation();
                  close();
                },
              },
              { default: () => props.children }
            ),
        }
      );
    };
  },
  {
    name: "AntdContextSurface",
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
