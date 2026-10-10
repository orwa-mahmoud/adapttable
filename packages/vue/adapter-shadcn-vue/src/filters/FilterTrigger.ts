import type {
  DataTableClassNames,
  FilterTriggerProps,
} from "@adapttable/vue/adapter";
import { ListFilter } from "@lucide/vue";
import { defineComponent, h, type PropType, shallowRef, watch } from "vue";

import { Button } from "../components/button";
import { shadcnControlAttrs } from "../controls";
import { cn } from "../lib/utils";

interface TriggerProps {
  readonly control: FilterTriggerProps;
  readonly classNames: DataTableClassNames;
}
/** The visible button is the sole semantic trigger and binding anchor owner. */
export const FilterTrigger = defineComponent(
  (props: TriggerProps) => {
    const elementRef = shallowRef<(element: Element | null) => void>();
    watch(
      () => props.control.triggerRef,
      (owner) => {
        elementRef.value = (element) =>
          owner(element instanceof HTMLElement ? element : null);
      },
      { immediate: true, flush: "sync" }
    );
    return () =>
      h(
        Button,
        {
          ...shadcnControlAttrs(props.control.attrs),
          type: "button",
          variant: "outline",
          class: cn(
            "min-h-11 sm:min-h-9",
            props.classNames.filtersButton,
            props.control.attrs.class as string | undefined
          ),
          elementRef: elementRef.value,
          onPointerdown: props.control.onPointerDown,
          onClick: props.control.onClick,
        },
        () => [
          h(ListFilter, {
            class: cn("size-4", props.classNames.filtersIcon),
            "aria-hidden": true,
            "data-adapttable-part": "filters-icon",
          }),
          props.control.label,
          props.control.count
            ? h(
                "span",
                {
                  class: cn(
                    "rounded-full bg-secondary px-1.5 text-xs tabular-nums",
                    props.classNames.filtersCount
                  ),
                  "data-adapttable-part": "filters-count",
                },
                props.control.count
              )
            : null,
        ]
      );
  },
  {
    name: "ShadcnFilterTrigger",
    props: {
      control: { type: Object as PropType<TriggerProps["control"]> },
      classNames: { type: Object as PropType<TriggerProps["classNames"]> },
    },
  }
);
