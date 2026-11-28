import {
  Dialog,
  DialogOverlay,
  DialogPanel,
  DialogTitle,
} from "@headlessui/vue";
import {
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  type PropType,
  watch,
} from "vue";

import { useHeadlessDirection } from "./direction";
import { hostPortalRoot, useHeadlessPortalContainer } from "./portal";

/**
 * A controlled Headless UI Dialog: a backdrop and a panel inside the Dialog's
 * own portal. The host owns `open`; Headless UI owns the focus trap, inert
 * page, scroll lock, Escape and backdrop press, and reports them as `onClose`.
 */
export const HeadlessDialog = defineComponent(
  (
    props: {
      readonly open: boolean;
      readonly label: string;
      readonly dir?: "ltr" | "rtl";
      readonly part?: string;
      readonly className?: string;
      readonly backdropClassName?: string;
      readonly container?: HTMLElement | null;
      readonly role?: "dialog" | "alertdialog";
      /** Draw the title instead of hiding it, as a confirmation does. */
      readonly showTitle?: boolean;
      readonly onClose: () => void;
      /** Runs once the dialog has closed, to return focus where the host wants it. */
      readonly onClosed?: () => void;
    },
    { slots }
  ) => {
    let wasOpen = props.open;
    // Closing, or being removed while open, both hand focus back to the host.
    const closed = () => {
      if (!wasOpen) return;
      wasOpen = false;
      void nextTick(() => props.onClosed?.());
    };
    watch(
      () => props.open,
      (open) => {
        if (open) wasOpen = true;
        else closed();
      },
      { flush: "sync" }
    );
    onBeforeUnmount(closed);
    const inherited = useHeadlessPortalContainer();
    const inheritedDir = useHeadlessDirection();
    const title = () =>
      h(
        DialogTitle,
        {
          class: props.showTitle ? undefined : "at-headless-visually-hidden",
        },
        { default: () => props.label }
      );
    return () => {
      const dir = props.dir ?? inheritedDir();
      hostPortalRoot(props.container ?? inherited());
      return h(
        Dialog,
        {
          open: props.open,
          role: props.role ?? "dialog",
          dir,
          class: "at-headless-dialog",
          onClose: () => props.onClose(),
        },
        {
          default: () => [
            h(DialogOverlay, {
              class: ["at-headless-backdrop", props.backdropClassName],
            }),
            h(
              DialogPanel,
              {
                dir,
                "aria-label": props.label,
                "data-adapttable-part": props.part,
                class: ["at-headless-surface", props.className],
              },
              {
                default: () => [title(), slots.default?.()],
              }
            ),
          ],
        }
      );
    };
  },
  {
    name: "HeadlessDialog",
    props: {
      open: { type: Boolean },
      label: { type: String },
      dir: { type: String as PropType<"ltr" | "rtl"> },
      part: { type: String },
      className: { type: String },
      backdropClassName: { type: String },
      container: { type: Object as PropType<HTMLElement | null> },
      role: { type: String as PropType<"dialog" | "alertdialog"> },
      showTitle: { type: Boolean },
      onClose: { type: Function as PropType<() => void> },
      onClosed: { type: Function as PropType<() => void> },
    },
  }
);
