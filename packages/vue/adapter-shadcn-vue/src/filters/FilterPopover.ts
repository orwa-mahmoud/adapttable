import type { FilterPanelSurfaceProps } from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

import { Popover, PopoverAnchor, PopoverContent } from "../components/popover";

interface PopoverProps extends FilterPanelSurfaceProps {
  readonly onCloseAutoFocus?: (event: Event) => void;
  /** The surface's part name; a column header's filter names its own. */
  readonly part?: string;
}

/** Reusable copied shadcn surface. Reka owns positioning and the dismiss stack. */
export const FilterPopover = defineComponent(
  (props: PopoverProps) => {
    const escape = (event: KeyboardEvent) => {
      event.preventDefault();
      props.onClose("escape");
    };
    const outside = (event: CustomEvent<{ originalEvent: Event }>) => {
      const target = event.detail.originalEvent.target;
      if (target instanceof Node && props.anchor?.contains(target)) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      props.onClose("outside");
    };
    return () =>
      h(
        Popover,
        {
          open: props.open,
        },
        () => [
          h(
            PopoverAnchor,
            { reference: props.anchor ?? undefined, asChild: true },
            () => h("span", { hidden: true, "aria-hidden": true })
          ),
          h(
            PopoverContent,
            {
              class: props.className,
              dir: props.dir,
              align: "start",
              portalTo: props.container ?? undefined,
              "aria-label": props.label,
              "data-adapttable-part": props.part ?? "filters-popover",
              onEscapeKeyDown: escape,
              onInteractOutside: outside,
              onCloseAutoFocus: (event: Event) => {
                event.preventDefault();
                props.onCloseAutoFocus?.(event);
              },
            },
            () => props.children
          ),
        ]
      );
  },
  {
    name: "ShadcnFilterPopover",
    props: {
      className: { type: String as PropType<PopoverProps["className"]> },
      open: {
        type: Boolean as PropType<PopoverProps["open"]>,
        default: undefined,
      },
      label: { type: String as PropType<PopoverProps["label"]> },
      dir: { type: String as PropType<PopoverProps["dir"]> },
      anchor: { type: Object as PropType<PopoverProps["anchor"]> },
      container: { type: Object as PropType<PopoverProps["container"]> },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          PopoverProps["children"]
        >,
        default: undefined,
      },
      onClose: { type: Function as PropType<PopoverProps["onClose"]> },
      onCloseAutoFocus: {
        type: Function as PropType<PopoverProps["onCloseAutoFocus"]>,
      },
      part: { type: String as PropType<PopoverProps["part"]> },
    },
  }
);
