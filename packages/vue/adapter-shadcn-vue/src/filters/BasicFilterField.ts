import {
  type DataTableClassNames,
  FILTER_FIELD_PARTS,
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldPart,
  useFilterFieldWith,
  withProps,
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

/** The runtime props of a basic field, for the components that wrap one. */
export const basicFieldProps = {
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
/** Props of a field drawn by a chosen set of field parts. */
export interface PartsFilterFieldProps<
  TRow,
> extends BasicFilterFieldProps<TRow> {
  /** The widget kinds this field can draw. */
  readonly parts: readonly FilterFieldPart[];
}

/** A basic field drawn by only the given field parts. */
export const PartsFilterField = defineComponent(
  (props: PartsFilterFieldProps<unknown>) => {
    const model = useFilterFieldWith(() => props, props.parts);
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
  {
    name: "ShadcnBasicFilterField",
    props: {
      ...basicFieldProps,
      parts: {
        type: Array as PropType<PartsFilterFieldProps<unknown>["parts"]>,
        required: true,
      },
    },
  }
);

/** Generic boundary keeps filter accessors tied to the host's row type. */
export const BasicFilterField = /* @__PURE__ */ withProps(
  function BasicFilterField<TRow>(
    props: BasicFilterFieldProps<TRow>,
    context: Pick<SetupContext, "attrs">
  ) {
    return createVNode(PartsFilterField, {
      ...context.attrs,
      ...props,
      dir: props.dir,
      parts: FILTER_FIELD_PARTS,
    });
  },
  Object.keys(basicFieldProps) as (keyof BasicFilterFieldProps<unknown>)[]
);
