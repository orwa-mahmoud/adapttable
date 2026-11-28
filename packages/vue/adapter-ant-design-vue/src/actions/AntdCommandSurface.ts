import {
  type ManagedCommandPaletteSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Modal } from "ant-design-vue";
import { defineComponent, h, type PropType, shallowRef } from "vue";
/** The Ant Design Vue modal owns focus trapping, Escape and outside dismissal. */
export const AntdCommandSurface = defineComponent(
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
        Modal,
        {
          open: active.value && owner.open && owner.isCurrent(),
          title: owner.label,
          class: owner.className,
          wrapProps: { dir: props.dir },
          getContainer: props.container,
          width: "min(32rem, calc(100vw - 2rem))",
          destroyOnClose: true,
          closable: false,
          footer: null,
          maskClosable: true,
          keyboard: true,
          onCancel: () => {
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
    name: "AntdCommandSurface",
    props: {
      control: { type: Object as PropType<ManagedCommandPaletteSurfaceProps> },
      container: { type: Object as PropType<HTMLElement | undefined> },
      dir: { type: String as PropType<("ltr" | "rtl") | undefined> },
    },
  }
);
