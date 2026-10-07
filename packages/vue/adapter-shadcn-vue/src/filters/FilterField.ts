import {
  defaultFilterRegistry,
  filterWidgetKind,
  useFilterHeaderControl,
} from "@adapttable/vue/adapter";
import { createVNode, defineComponent, h, type SetupContext } from "vue";

import {
  BasicFilterField,
  type BasicFilterFieldProps,
} from "./BasicFilterField";
import { ChecklistFilter } from "./ChecklistFilter";

// The header field model already supplies a lifetime-guarded custom renderer.
// Reuse that binding-owned path rather than calling user renderers with raw state.
const CustomField = defineComponent(
  (props: BasicFilterFieldProps<unknown>) => {
    const model = useFilterHeaderControl(() => props);
    return () => (model.value?.kind === "custom" ? model.value.content : null);
  },
  { name: "ShadcnCustomFilterField", props: BasicFilterField.props }
);

/** The registry determines the widget; the binding owns each widget's model. */
export function FilterField<TRow>(
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
}
FilterField.props = BasicFilterField.props;
