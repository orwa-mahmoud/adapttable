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
export const ShadcnCommandDialog = defineComponent(
  (props: Props) => {
    let opener: HTMLElement | null = null;
    const content = () =>
      h(
        DialogContent,
        {
          dir: props.dir,
          class: [
            "adapttable-shadcn-vue fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-4 text-foreground shadow-lg [&_[data-adapttable-part=command-list]]:max-h-80 [&_[data-adapttable-part=command-list]]:overflow-y-auto",
            props.className,
          ],
          "data-adapttable-part": "command-palette",
          "data-slot": "dialog-content",
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
              { class: "sr-only" },
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
            h(DialogOverlay, { class: "fixed inset-0 z-50 bg-black/50" }),
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
    name: "ShadcnCommandDialog",
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
