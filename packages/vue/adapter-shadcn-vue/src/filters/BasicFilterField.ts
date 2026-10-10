import {
  type DataTableClassNames,
  FilterFieldChrome,
  type FilterFieldOptions,
  useFilterField,
} from "@adapttable/vue/adapter";
import {
  createVNode,
  defineComponent,
  type PropType,
  type SetupContext,
} from "vue";

import { shadcnFilterControls } from "../filterControls";
import { filterClassNames } from "./presentation";

export interface BasicFilterFieldProps<TRow> extends FilterFieldOptions<TRow> {
  readonly classNames?: DataTableClassNames;
  readonly className?: string;
  readonly dir?: "ltr" | "rtl";
}

const propNames = {
  id: { type: String as PropType<BasicFilterFieldProps<unknown>["id"]> },
  def: { type: Object as PropType<BasicFilterFieldProps<unknown>["def"]> },
  source: {
    type: Object as PropType<BasicFilterFieldProps<unknown>["source"]>,
  },
  labels: {
    type: Object as PropType<BasicFilterFieldProps<unknown>["labels"]>,
  },
  registry: {
    type: Object as PropType<BasicFilterFieldProps<unknown>["registry"]>,
  },
  classNames: {
    type: Object as PropType<BasicFilterFieldProps<unknown>["classNames"]>,
  },
  className: {
    type: String as PropType<BasicFilterFieldProps<unknown>["className"]>,
  },
  dir: { type: String as PropType<BasicFilterFieldProps<unknown>["dir"]> },
};
const BasicFieldPresentation = defineComponent(
  (props: BasicFilterFieldProps<unknown>) => {
    const model = useFilterField(() => props);
    const controls = shadcnFilterControls(
      () => filterClassNames(props.classNames),
      () => props.dir
    );
    return () =>
      FilterFieldChrome({
        model: model.value,
        controls,
        classNames: filterClassNames(props.classNames),
        className: props.className,
      });
  },
  { name: "ShadcnBasicFilterField", props: propNames }
);

/** Generic boundary keeps filter accessors tied to the host's row type. */
export function BasicFilterField<TRow>(
  props: BasicFilterFieldProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(BasicFieldPresentation, {
    ...context.attrs,
    ...props,
    dir: props.dir,
  });
}
BasicFilterField.props = Object.keys(
  propNames
) as (keyof BasicFilterFieldProps<unknown>)[];
