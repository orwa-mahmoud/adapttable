import type { ManagedCommandPaletteSurfaceProps } from "@adapttable/vue/adapter";
import {
  ConfigProvider,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { defineComponent, h, type PropType } from "vue";

type Props = ManagedCommandPaletteSurfaceProps & {
  readonly dir: "ltr" | "rtl";
  readonly container?: HTMLElement;
};

/** Dialog owns dismissal and focus; Chrome supplies the original opener and lifetime. */
export const RekaCommandDialog = defineComponent(
  (props: Props) => {
    let opener: HTMLElement | null = null;
    const content = () =>
      h(
        DialogContent,
        {
          dir: props.dir,
          class: ["at-reka-surface", "at-reka-command-dialog", props.className],
          "data-adapttable-part": "command-palette",
          "aria-describedby": undefined,
          onOpenAutoFocus: () => {
            const current = document.activeElement;
            opener =
              props.getOpener() ??
              (current instanceof HTMLElement ? current : null);
          },
          onCloseAutoFocus: (event: Event) => {
            event.preventDefault();
            if (props.isCurrent() && opener?.isConnected) opener.focus();
          },
        },
        {
          default: () => [
            h(
              DialogTitle,
              { class: "at-reka-visually-hidden" },
              { default: () => props.label }
            ),
            props.children,
          ],
        }
      );
    const portal = () =>
      h(
        DialogPortal,
        { to: props.container ?? "body" },
        {
          default: () => [
            h(DialogOverlay, { class: "at-reka-backdrop" }),
            content(),
          ],
        }
      );
    const dialog = () =>
      h(
        DialogRoot,
        {
          open: props.open,
          "onUpdate:open": (open: boolean) => {
            if (!open && props.isCurrent()) props.onClose();
          },
        },
        { default: portal }
      );
    return () => h(ConfigProvider, { dir: props.dir }, { default: dialog });
  },
  {
    name: "RekaCommandDialog",
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
