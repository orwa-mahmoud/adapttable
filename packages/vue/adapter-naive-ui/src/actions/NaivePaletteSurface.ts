import type { Direction } from "@adapttable/vue";
import type { ManagedCommandPaletteSurfaceProps } from "@adapttable/vue/adapter";
import { NCard, NModal } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  shallowRef,
} from "vue";

import { htmlRoot } from "../controls/elementTarget";
import { useNaiveModalEscape } from "../controls/modalEscape";

/** Naive owns modal autofocus, Tab trapping, and focus restoration. */
export const NaivePaletteSurface = /*#__PURE__*/ defineComponent(
  (props: {
    readonly control: ManagedCommandPaletteSurfaceProps;
    readonly container?: HTMLElement;
    readonly dir: Direction;
  }) => {
    const card = shallowRef<ComponentPublicInstance | null>(null);
    const escape = useNaiveModalEscape(() =>
      card.value ? htmlRoot(card.value) : null
    );
    return () => {
      const owner = props.control;
      const close = () => {
        if (owner.open && owner.isCurrent()) owner.onClose();
      };
      return h(
        NModal,
        {
          show: owner.open && owner.isCurrent(),
          to: props.container,
          autoFocus: true,
          trapFocus: true,
          "onUpdate:show": (show: boolean) => {
            if (!show && escape.allow()) close();
          },
        },
        {
          default: () =>
            h(
              NCard,
              {
                ref: card,
                role: "dialog",
                dir: props.dir,
                onKeydownCapture: escape.capture,
                "aria-modal": true,
                "aria-label": owner.label,
                "data-adapttable-part": "command-palette",
                class: owner.className,
                style: {
                  width: "min(40rem,calc(100vw - 2rem))",
                  maxHeight: "75dvh",
                  overflow: "auto",
                },
              },
              { default: () => owner.children }
            ),
        }
      );
    };
  },
  { name: "NaivePaletteSurface", props: ["control", "container", "dir"] }
);
