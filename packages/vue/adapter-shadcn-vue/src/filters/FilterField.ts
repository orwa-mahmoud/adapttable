import {
  defaultFilterRegistry,
  filterWidgetKind,
  useRegisteredFilterRender,
  withProps,
} from "@adapttable/vue/adapter";
import { createVNode, defineComponent, h, type SetupContext } from "vue";

import {
  basicFieldProps,
  BasicFilterField,
  type BasicFilterFieldProps,
} from "./BasicFilterField";
import { ChecklistFilter } from "./ChecklistFilter";

// The binding calls the registered render through the field's action owner,
// so a retired field cannot write through it.
export const CustomField = defineComponent(
  (props: BasicFilterFieldProps<unknown>) => {
    const content = useRegisteredFilterRender(() => props);
    return () => content.value ?? null;
  },
  { name: "ShadcnCustomFilterField", props: basicFieldProps }
);

/** The registry determines the widget; the binding owns each widget's model. */
export const FilterField = /* @__PURE__ */ withProps(
  function FilterField<TRow>(
    props: BasicFilterFieldProps<TRow>,
    context: Pick<SetupContext, "attrs">
  ) {
    const registry = props.registry ?? defaultFilterRegistry;
    if (registry.get(props.def.type)?.render)
      return createVNode(CustomField, { ...context.attrs, ...props });
    if (filterWidgetKind(props.def, registry) === "checklist")
      return h(ChecklistFilter<TRow>, {
        ...context.attrs,
        def: props.def,
        source: props.source,
        labels: props.labels,
        classNames: props.classNames,
        dir: props.dir,
      });
    return h(BasicFilterField<TRow>, { ...context.attrs, ...props });
  },
  Object.keys(basicFieldProps) as (keyof BasicFilterFieldProps<unknown>)[]
);
