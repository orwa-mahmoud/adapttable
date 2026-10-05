import type { ColumnDef, ColumnLayout } from "@adapttable/vue";
import {
  columnMenu,
  columnMenuSlotKey,
  type ColumnMenuSlotProps,
  type ColumnMenuSlots,
} from "@adapttable/vue/column-menu";
import { slotRender, type TableFeature } from "@adapttable/vue/features";
import { h } from "vue";
interface Person {
  readonly id: string;
  readonly name: string;
}
export const features: readonly TableFeature<Person>[] = [columnMenu()];
export const typedFill = slotRender(columnMenuSlotKey<Person>(), (props) => {
  const columns: readonly ColumnDef<Person>[] = props.allColumns;
  const layout: ColumnLayout<Person> = props.layout;
  return h("span", `${columns.length}: ${layout.state.hidden.length}`);
});
export const controls: ColumnMenuSlots = {
  Trigger: ({ attrs, label }) => h("button", attrs, label),
  Button: ({ attrs, label }) => h("button", attrs, label),
  Input: ({ value }) => h("span", value),
  Choice: ({ options, value }) => h("span", `${options.length}: ${value}`),
  Panel: ({ attrs, content }) => h("section", attrs, [content]),
};
export function acceptsPerson(
  props: ColumnMenuSlotProps<Person>
): ColumnDef<Person> | undefined {
  return props.allColumns[0];
}
