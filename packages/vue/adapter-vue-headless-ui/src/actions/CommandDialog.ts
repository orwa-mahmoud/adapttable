import type { ManagedCommandPaletteSurfaceProps } from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

import { HeadlessDialog } from "../controls/dialog";

type Props = ManagedCommandPaletteSurfaceProps & {
  readonly dir: "ltr" | "rtl";
  readonly container?: HTMLElement;
};

/** Dialog owns dismissal and focus; Chrome supplies the original opener and lifetime. */
export const HeadlessCommandDialog = defineComponent(
  (props: Props) => {
    let opener: HTMLElement | null = null;
    return () => {
      if (props.open && !opener) {
        const current = document.activeElement;
        opener =
          props.getOpener() ??
          (current instanceof HTMLElement ? current : null);
      }
      return h(
        HeadlessDialog,
        {
          open: props.open,
          label: props.label,
          dir: props.dir,
          part: "command-palette",
          className: ["at-headless-command-dialog", props.className]
            .filter(Boolean)
            .join(" "),
          container: props.container,
          onClose: () => {
            if (props.isCurrent()) props.onClose();
          },
          onClosed: () => {
            const target = opener;
            opener = null;
            if (props.isCurrent() && target?.isConnected) target.focus();
          },
        },
        { default: () => props.children }
      );
    };
  },
  {
    name: "HeadlessCommandDialog",
    props: {
      open: { type: Boolean as PropType<Props["open"]>, default: undefined },
      isCurrent: { type: Function as PropType<Props["isCurrent"]> },
      getOpener: { type: Function as PropType<Props["getOpener"]> },
      onClose: { type: Function as PropType<Props["onClose"]> },
      label: { type: String as PropType<Props["label"]> },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          Props["children"]
        >,
        default: undefined,
      },
      className: { type: String as PropType<Props["className"]> },
      dir: { type: String as PropType<Props["dir"]> },
      container: { type: Object as PropType<Props["container"]> },
    },
  }
);
