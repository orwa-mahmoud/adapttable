import {
  type ManagedCommandPaletteSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { QCard, QCardSection, QDialog } from "quasar";
import {
  defineComponent,
  h,
  onBeforeUnmount,
  type PropType,
  shallowRef,
} from "vue";

import { finishOverlayFocus } from "./focusHandoff";

/** QDialog owns focus containment and dismissal; unmount finishes its focus handoff. */
export const QuasarCommandSurface = defineComponent(
  (props: {
    readonly control: ManagedCommandPaletteSurfaceProps;
    readonly dir: "ltr" | "rtl";
  }) => {
    const active = useScopeActivity();
    const initialFocus =
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const card = shallowRef<InstanceType<typeof QCard> | null>(null);
    onBeforeUnmount(() => {
      const control = props.control;
      const opener = initialFocus ?? control.getOpener();
      const root: unknown = card.value?.$el;
      finishOverlayFocus(
        opener,
        root instanceof HTMLElement ? root : null,
        control.isCurrent
      );
    });
    return () => {
      const control = props.control;
      if (!active.value || !control.open || !control.isCurrent()) return null;
      const content = () => control.children;
      const section = () => h(QCardSection, {}, content);
      const surface = () =>
        h(
          QCard,
          {
            ref: card,
            dir: props.dir,
            style: { width: "36rem", maxWidth: "calc(100vw - 2rem)" },
          },
          section
        );
      return h(
        QDialog,
        {
          modelValue: true,
          noRefocus: true,
          transitionDuration: 0,
          "aria-label": control.label,
          dir: props.dir,
          class: control.className,
          "data-adapttable-part": "command-palette",
          "onUpdate:modelValue": (open: boolean) => {
            if (!open && active.value && control.isCurrent()) control.onClose();
          },
        },
        surface
      );
    };
  },
  {
    name: "QuasarCommandSurface",
    props: {
      control: { type: Object as PropType<ManagedCommandPaletteSurfaceProps> },
      dir: { type: String as PropType<"ltr" | "rtl"> },
    },
  }
);
