import {
  booleanFieldPart,
  type DataTableClassNames,
  type FilterFieldOptions,
  type FilterFieldPart,
  type FilterWidget,
  multiSelectFieldPart,
  rangeFieldPart,
  selectFieldPart,
  textFieldPart,
} from "@adapttable/vue/adapter";
import { type FunctionalComponent, h } from "vue";

import AntdBasicFilterField from "./AntdBasicFilterField.vue";
import AntdChecklistField from "./AntdChecklistField.vue";

/** A field drawn by one shared field part. */
function basicWidget(part: FilterFieldPart): FilterWidget {
  const render: FunctionalComponent<
    FilterFieldOptions<unknown> & { classNames?: DataTableClassNames }
  > = (props) => h(AntdBasicFilterField<unknown>, { ...props, parts: [part] });
  return { kinds: part.kinds, render };
}

const ChecklistField: FunctionalComponent<
  FilterFieldOptions<unknown> & { classNames?: DataTableClassNames }
> = (props) => h(AntdChecklistField<unknown>, { ...props });

/** The Ant Design Vue text filter: its operator and its value. @public */
export const textFilterWidget = /* @__PURE__ */ basicWidget(textFieldPart);
/** The Ant Design Vue yes/no filter. @public */
export const booleanFilterWidget =
  /* @__PURE__ */ basicWidget(booleanFieldPart);
/** The Ant Design Vue single-choice filter. @public */
export const selectFilterWidget = /* @__PURE__ */ basicWidget(selectFieldPart);
/** The Ant Design Vue multiple-choice filter. @public */
export const multiSelectFilterWidget =
  /* @__PURE__ */ basicWidget(multiSelectFieldPart);
/** The Ant Design Vue searchable checklist filter. @public */
export const checklistFilterWidget: FilterWidget = {
  kinds: ["checklist"],
  render: ChecklistField,
};
/** The Ant Design Vue operator-first number and date range filter. @public */
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
