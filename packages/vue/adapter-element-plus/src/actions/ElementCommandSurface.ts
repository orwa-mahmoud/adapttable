import {
  type ManagedCommandPaletteSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { ElDialog } from "element-plus";
import { defineComponent, h, type PropType, shallowRef } from "vue";
/** ElDialog owns focus trapping, Escape and outside dismissal. */
export const ElementCommandSurface = defineComponent(
  (props: {
    readonly control: ManagedCommandPaletteSurfaceProps;
    readonly container?: HTMLElement;
    readonly dir?: "ltr" | "rtl";
  }) => {
    const active = useScopeActivity();
    const body = shallowRef<HTMLElement | null>(null);
    return () => {
      const owner = props.control;
      return h(
        ElDialog,
        {
          modelValue: active.value && owner.open && owner.isCurrent(),
          title: owner.label,
          class: owner.className,
          dir: props.dir,
          appendTo: props.container ?? "body",
          appendToBody: true,
          width: "min(32rem, calc(100vw - 2rem))",
          destroyOnClose: true,
          showClose: false,
          closeOnClickModal: true,
          closeOnPressEscape: true,
          beforeClose: () => {
            if (active.value && owner.isCurrent()) owner.onClose();
          },
        },
        {
          default: () =>
            h("div", { ref: body, "data-adapttable-part": "command-palette" }, [
              owner.children,
            ]),
        }
      );
    };
  },
  {
    name: "ElementCommandSurface",
    props: {
      control: { type: Object as PropType<ManagedCommandPaletteSurfaceProps> },
      container: { type: Object as PropType<HTMLElement | undefined> },
      dir: { type: String as PropType<("ltr" | "rtl") | undefined> },
    },
  }
);
