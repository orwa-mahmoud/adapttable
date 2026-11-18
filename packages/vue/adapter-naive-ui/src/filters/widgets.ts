import {
  booleanFieldPart,
  type FilterFieldOptions,
  type FilterFieldPart,
  type FilterWidget,
  multiSelectFieldPart,
  rangeFieldPart,
  selectFieldPart,
  textFieldPart,
} from "@adapttable/vue/adapter";
import { type FunctionalComponent, h } from "vue";

import NaiveBasicFilterField from "./NaiveBasicFilterField.vue";
import NaiveChecklistField from "./NaiveChecklistField.vue";

/** A field drawn by one shared field part. */
function basicWidget(part: FilterFieldPart): FilterWidget {
  const render: FunctionalComponent<FilterFieldOptions<unknown>> = (props) =>
    h(NaiveBasicFilterField<unknown>, { ...props, parts: [part] });
  return { kinds: part.kinds, render };
}

const ChecklistField: FunctionalComponent<FilterFieldOptions<unknown>> = (
  props
) => h(NaiveChecklistField<unknown>, { ...props });

/** The Naive UI text filter: its operator and its value. @public */
export const textFilterWidget = /* @__PURE__ */ basicWidget(textFieldPart);
/** The Naive UI yes/no filter. @public */
export const booleanFilterWidget =
  /* @__PURE__ */ basicWidget(booleanFieldPart);
/** The Naive UI single-choice filter. @public */
export const selectFilterWidget = /* @__PURE__ */ basicWidget(selectFieldPart);
/** The Naive UI multiple-choice filter. @public */
export const multiSelectFilterWidget =
  /* @__PURE__ */ basicWidget(multiSelectFieldPart);
/** The Naive UI searchable checklist filter. @public */
export const checklistFilterWidget: FilterWidget = {
  kinds: ["checklist"],
  render: ChecklistField,
};
/** The Naive UI operator-first number and date range filter. @public */
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
