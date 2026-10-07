import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderMultiProps,
  type FilterHeaderSlots,
  useFilterHeaderControl,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  createVNode,
  defineComponent,
  h,
  type SetupContext,
  shallowRef,
  watch,
} from "vue";

import { Button } from "../components/button";
import { Checkbox } from "../components/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../components/popover";
import { shadcnInput, shadcnSelect } from "../controls";
import { cn } from "../lib/utils";

interface MultiProps extends FilterHeaderMultiProps {
  readonly dir?: "ltr" | "rtl";
}
function multiOptions(props: MultiProps) {
  return props.options.map((option) =>
    h(
      "label",
      {
        key: option.value,
        class: "flex min-h-11 cursor-pointer items-center gap-2",
        "data-adapttable-part": "filter-checkbox",
      },
      [
        h(Checkbox, {
          modelValue: props.selected.includes(option.value),
          "aria-label": option.label,
          "onUpdate:modelValue": (checked: boolean | "indeterminate") =>
            props.onToggle(option.value, checked === true),
        }),
        option.label,
      ]
    )
  );
}
function multiTrigger(props: MultiProps) {
  return h(
    Button,
    {
      type: "button",
      variant: "outline",
      class: cn(
        "min-h-11 max-w-full justify-between sm:min-h-9",
        props.className
      ),
      "data-adapttable-part": "filter-header-input",
      "aria-label": props.label,
      dir: props.dir,
    },
    () => props.summary
  );
}
const Multi = defineComponent(
  (props: MultiProps) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    watch(
      active,
      (live) => {
        if (!live) open.value = false;
      },
      { flush: "sync" }
    );
    const changeOpen = (value: boolean) => {
      if (active.value) open.value = value;
    };
    const content = () => [
      h(PopoverTrigger, { asChild: true }, () => multiTrigger(props)),
      h(
        PopoverContent,
        {
          align: "start",
          onCloseAutoFocus: (event: Event) => {
            if (!active.value) event.preventDefault();
          },
          dir: props.dir,
          "aria-label": props.label,
          class: cn("grid max-h-80 gap-1 overflow-auto", props.menuClassName),
          "data-adapttable-part": "filter-header-menu",
        },
        () => multiOptions(props)
      ),
    ];
    return () =>
      h(
        Popover,
        { open: active.value && open.value, "onUpdate:open": changeOpen },
        content
      );
  },
  {
    name: "ShadcnHeaderMulti",
    props: [
      "label",
      "summary",
      "options",
      "selected",
      "className",
      "menuClassName",
      "onToggle",
      "dir",
    ],
  }
);
const propNames: (keyof FilterHeaderControlOptions<unknown>)[] = [
  "def",
  "source",
  "labels",
  "registry",
  "className",
  "menuClassName",
  "closeOnSelect",
  "dir",
];
const HeaderControlPresentation = defineComponent(
  (props: FilterHeaderControlOptions<unknown>) => {
    const model = useFilterHeaderControl(() => props);
    const controls: FilterHeaderSlots = {
      Search: (control) =>
        shadcnInput({
          ...control,
          attrs: {
            type: "search",
            dir: props.dir,
            placeholder: control.placeholder,
            class: cn("min-h-11 sm:min-h-9", control.className),
            "aria-label": control.label,
            "data-adapttable-part": "filter-header-input",
          },
        }),
      Select: (control) =>
        shadcnSelect({
          ...control,
          attrs: {
            dir: props.dir,
            class: cn("min-h-11 sm:min-h-9", control.className),
            "aria-label": control.label,
            "data-adapttable-part": "filter-header-input",
          },
        }),
      Range: (control) =>
        shadcnInput({
          ...control,
          attrs: {
            type: control.type,
            dir: props.dir,
            class: "min-h-11 sm:min-h-9",
            "aria-label": control.label,
            "data-adapttable-part": "filter-header-range",
          },
        }),
      Multi: (control) => h(Multi, { ...control, dir: props.dir }),
    };
    return () => FilterHeaderControlChrome({ model: model.value, controls });
  },
  { name: "ShadcnFilterHeaderControl", props: propNames }
);

export function FilterHeaderControl<TRow>(
  props: FilterHeaderControlOptions<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(HeaderControlPresentation, { ...context.attrs, ...props });
}
FilterHeaderControl.props = propNames;
