import {
  type ContextMenuSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { QList, QMenu } from "quasar";
import { defineComponent, h, onMounted, shallowRef, watch } from "vue";

import { focusMenuItem, moveMenuFocus } from "./menuFocus";

export const QuasarContextSurface = defineComponent(
  (props: {
    readonly control: ContextMenuSurfaceProps;
    readonly dir: "ltr" | "rtl";
  }) => {
    const active = useScopeActivity();
    const target = shallowRef<HTMLElement | null>(null);
    const list = shallowRef<InstanceType<typeof QList> | null>(null);
    const read = () => {
      target.value = props.control.anchorRef.current;
    };
    onMounted(read);
    watch(() => props.control.at, read, { flush: "post" });
    return () =>
      active.value && target.value
        ? h(
            QMenu,
            {
              modelValue: true,
              target: target.value,
              noParentEvent: true,
              // The canonical context controller restores its real cell/header opener.
              noRefocus: true,
              noFocus: true,
              transitionDuration: 0,
              anchor: "top left",
              self: "top left",
              "onUpdate:modelValue": (open: boolean) => {
                if (!open && active.value) props.control.onClose();
              },
              onShow: () => {
                const element: unknown = list.value?.$el;
                if (active.value && element instanceof HTMLElement)
                  focusMenuItem(element);
              },
            },
            () =>
              h(
                QList,
                {
                  ref: list,
                  dir: props.dir,
                  role: "menu",
                  "aria-label": props.control.label,
                  class: props.control.className,
                  "data-adapttable-part": "context-menu",
                  onKeydown: moveMenuFocus,
                },
                () => props.control.children
              )
          )
        : null;
  },
  { name: "QuasarContextSurface", props: ["control", "dir"] }
);
