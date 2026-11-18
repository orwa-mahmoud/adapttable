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

import NativeBasicFilterField from "./NativeBasicFilterField.vue";
import NativeChecklistField from "./NativeChecklistField.vue";

/** A field drawn by one shared field part. */
function basicWidget(part: FilterFieldPart): FilterWidget {
  const render: FunctionalComponent<FilterFieldOptions<unknown>> = (props) =>
    h(NativeBasicFilterField<unknown>, { ...props, parts: [part] });
  return { kinds: part.kinds, render };
}

const ChecklistField: FunctionalComponent<FilterFieldOptions<unknown>> = (
  props
) => h(NativeChecklistField<unknown>, { ...props });

/** The unstyled text filter: its operator and its value. @public */
export const textFilterWidget = /* @__PURE__ */ basicWidget(textFieldPart);
/** The unstyled yes/no filter. @public */
export const booleanFilterWidget =
  /* @__PURE__ */ basicWidget(booleanFieldPart);
/** The unstyled single-choice filter. @public */
export const selectFilterWidget = /* @__PURE__ */ basicWidget(selectFieldPart);
/** The unstyled multiple-choice filter. @public */
export const multiSelectFilterWidget =
  /* @__PURE__ */ basicWidget(multiSelectFieldPart);
/** The unstyled searchable checklist filter. @public */
export const checklistFilterWidget: FilterWidget = {
  kinds: ["checklist"],
  render: ChecklistField,
};
/** The unstyled operator-first number and date range filter. @public */
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
