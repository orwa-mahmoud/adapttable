import {
  type ActiveFilterChipsSlotProps,
  type DataTableClassNames,
  FilterChipsChrome,
} from "@adapttable/vue/adapter";
import { X } from "@lucide/vue";
import { defineComponent, h } from "vue";

import { Button } from "../components/button";
import { shadcnControlAttrs } from "../controls";
import { cn } from "../lib/utils";
import { filterClassNames } from "./presentation";

/** Props for the shadcn-vue active filter chips. */
export interface FilterChipsProps extends ActiveFilterChipsSlotProps {
  readonly classNames?: DataTableClassNames;
}
export const FilterChips = defineComponent(
  (props: FilterChipsProps) => () =>
    FilterChipsChrome({
      ...props,
      classNames: filterClassNames(props.classNames),
      slots: {
        Remove: (control) =>
          h(
            Button,
            {
              ...shadcnControlAttrs(control.attrs),
              variant: "ghost",
              size: "icon",
              class: cn(
                "size-11 sm:size-8",
                control.attrs.class as string | undefined
              ),
            },
            () => h(X, { class: "size-3.5", "aria-hidden": true })
          ),
        Clear: (control) =>
          h(
            Button,
            {
              ...shadcnControlAttrs(control.attrs),
              variant: "ghost",
              class: cn(
                "min-h-11 sm:min-h-9",
                control.attrs.class as string | undefined
              ),
            },
            () => control.label
          ),
      },
    }),
  {
    name: "ShadcnFilterChips",
    props: ["chips", "labels", "onClearAll", "classNames"],
  }
);
