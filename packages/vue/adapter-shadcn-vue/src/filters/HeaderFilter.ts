import {
  type DataTableClassNames,
  type FilterTriggerProps,
  HeaderFilterChrome,
  type HeaderFilterOptions,
  useHeaderFilter,
} from "@adapttable/vue/adapter";
import { ListFilter } from "@lucide/vue";
import {
  createVNode,
  defineComponent,
  h,
  type SetupContext,
  shallowRef,
  watch,
} from "vue";

import { Button } from "../components/button";
import { shadcnControlAttrs } from "../controls";
import { cn } from "../lib/utils";
import { FilterField } from "./FilterField";
import { FilterPopover } from "./FilterPopover";
import { filterClassNames } from "./presentation";

export interface HeaderFilterProps<TRow> extends HeaderFilterOptions<TRow> {
  readonly classNames?: DataTableClassNames;
}
const Trigger = defineComponent(
  (props: { control: FilterTriggerProps }) => {
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
          variant: "ghost",
          class: cn(
            "min-h-11 px-2 sm:min-h-9",
            props.control.attrs.class as string | undefined
          ),
          elementRef: elementRef.value,
          "aria-label": props.control.label,
          onPointerdown: props.control.onPointerDown,
          onClick: props.control.onClick,
        },
        () => [
          h(ListFilter, { class: "size-4", "aria-hidden": true }),
          props.control.count
            ? h(
                "span",
                { class: "text-xs tabular-nums", "aria-hidden": true },
                props.control.count
              )
            : null,
        ]
      );
  },
  { name: "ShadcnHeaderFilterTrigger", props: ["control"] }
);
const propNames: (keyof HeaderFilterProps<unknown>)[] = [
  "id",
  "def",
  "source",
  "labels",
  "registry",
  "className",
  "classNames",
  "closeOnSelect",
  "dir",
];
const HeaderPresentation = defineComponent(
  (props: HeaderFilterProps<unknown>) => {
    const model = useHeaderFilter(() => ({
      ...props,
      className: cn(
        props.classNames?.filterHeaderButton,
        props.classNames?.filterHeaderTrigger,
        props.className
      ),
    }));
    return () =>
      HeaderFilterChrome({
        model: model.value,
        controls: {
          Trigger: (control) => h(Trigger, { control }),
          Popover: (control) =>
            h(FilterPopover, {
              ...control,
              className: cn(
                "w-80 max-w-[calc(100vw-2rem)]",
                props.classNames?.filtersPopover
              ),
            }),
          Field: (control) =>
            h(FilterField, {
              ...control,
              classNames: filterClassNames(props.classNames),
              dir: props.dir,
            }),
        },
      });
  },
  { name: "ShadcnHeaderFilter", props: propNames }
);

export function HeaderFilter<TRow>(
  props: HeaderFilterProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(HeaderPresentation, { ...context.attrs, ...props });
}
HeaderFilter.props = propNames;
