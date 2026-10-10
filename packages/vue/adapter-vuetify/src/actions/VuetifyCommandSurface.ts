import {
  type ManagedCommandPaletteSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  type PropType,
  shallowRef,
} from "vue";
import { VCard, VCardText } from "vuetify/components/VCard";
import { VDialog } from "vuetify/components/VDialog";

import { finishOverlayFocus } from "./focusHandoff";

/** Vuetify owns modal trapping and dismissal; Chrome owns command admission. */
export const VuetifyCommandSurface = defineComponent(
  (props: {
    readonly control: ManagedCommandPaletteSurfaceProps;
    readonly dir: "ltr" | "rtl";
    readonly container?: HTMLElement;
  }) => {
    const active = useScopeActivity();
    const card = shallowRef<InstanceType<typeof VCard> | null>(null);
    const opener =
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focus = () => {
      const control = props.control;
      void nextTick(() => {
        const root: unknown = card.value?.$el;
        if (
          !active.value ||
          !control.open ||
          !control.isCurrent() ||
          !(root instanceof HTMLElement)
        )
          return;
        const current = root.ownerDocument.activeElement;
        if (
          current === opener ||
          current === root.ownerDocument.body ||
          root.contains(current)
        )
          root
            .querySelector<HTMLInputElement>('input[role="combobox"]')
            ?.focus({ preventScroll: true });
      });
    };
    onBeforeUnmount(() => {
      const control = props.control;
      const root: unknown = card.value?.$el;
      finishOverlayFocus(
        opener ?? control.getOpener(),
        root instanceof HTMLElement ? root : null,
        control.isCurrent
      );
    });
    return () => {
      const control = props.control;
      if (!active.value || !control.open || !control.isCurrent()) return null;
      const content = () => control.children;
      const body = () => h(VCardText, {}, content);
      return h(
        VDialog,
        {
          onAfterEnter: focus,
          modelValue: true,
          attach: props.container ?? false,
          transition: false,
          maxWidth: "min(36rem, calc(100vw - 2rem))",
          maxHeight: "min(80dvh, 640px)",
          "aria-label": control.label,
          dir: props.dir,
          class: control.className,
          "data-adapttable-part": "command-palette",
          "onUpdate:modelValue": (open: boolean) => {
            if (!open && active.value && control.isCurrent()) control.onClose();
          },
        },
        () =>
          h(VCard, { ref: card, dir: props.dir, onVnodeMounted: focus }, body)
      );
    };
  },
  {
    name: "VuetifyCommandSurface",
    props: {
      control: { type: Object as PropType<ManagedCommandPaletteSurfaceProps> },
      dir: { type: String as PropType<"ltr" | "rtl"> },
      container: { type: Object as PropType<HTMLElement | undefined> },
    },
  }
);
