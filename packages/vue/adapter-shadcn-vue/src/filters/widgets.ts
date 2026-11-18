import {
  booleanFieldPart,
  type FilterFieldPart,
  type FilterWidget,
  multiSelectFieldPart,
  rangeFieldPart,
  selectFieldPart,
  textFieldPart,
} from "@adapttable/vue/adapter";
import { type FunctionalComponent, h } from "vue";

import {
  type BasicFilterFieldProps,
  PartsFilterField,
} from "./BasicFilterField";
import { ChecklistFilter } from "./ChecklistFilter";

/** A field drawn by one shared field part. */
function basicWidget(part: FilterFieldPart): FilterWidget {
  const render: FunctionalComponent<BasicFilterFieldProps<unknown>> = (props) =>
    h(PartsFilterField, { ...props, parts: [part] });
  return { kinds: part.kinds, render };
}

const ChecklistField: FunctionalComponent<BasicFilterFieldProps<unknown>> = (
  props
) =>
  h(ChecklistFilter<unknown>, {
    def: props.def,
    source: props.source,
    labels: props.labels,
    classNames: props.classNames,
    dir: props.dir,
  });

/** The shadcn-vue text filter: its operator and its value. @public */
export const textFilterWidget = /* @__PURE__ */ basicWidget(textFieldPart);
/** The shadcn-vue yes/no filter. @public */
export const booleanFilterWidget =
  /* @__PURE__ */ basicWidget(booleanFieldPart);
/** The shadcn-vue single-choice filter. @public */
export const selectFilterWidget = /* @__PURE__ */ basicWidget(selectFieldPart);
/** The shadcn-vue multiple-choice filter. @public */
export const multiSelectFilterWidget =
  /* @__PURE__ */ basicWidget(multiSelectFieldPart);
/** The shadcn-vue searchable checklist filter. @public */
export const checklistFilterWidget: FilterWidget = {
  kinds: ["checklist"],
  render: ChecklistField,
};
/** The shadcn-vue operator-first number and date range filter. @public */
export const rangeFilterWidget = /* @__PURE__ */ basicWidget(rangeFieldPart);

/** Every built-in widget: what the automatic filters form draws. */
export const FILTER_WIDGETS: readonly FilterWidget[] = [
  textFilterWidget,
  booleanFilterWidget,
  selectFilterWidget,
  multiSelectFilterWidget,
  checklistFilterWidget,
  rangeFilterWidget,
];
