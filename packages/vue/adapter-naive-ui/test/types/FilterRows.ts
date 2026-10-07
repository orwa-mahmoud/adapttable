import type {
  ChecklistFilter,
  FilterTreeBuilder,
  NaiveFilterField,
} from "@adapttable/naive-ui/filters";
import type {
  FilterHeaderControl,
  FilterHeaderRow,
  NaiveHeaderFilter,
} from "@adapttable/naive-ui/header-filters";
import type {
  ChecklistFilterProps,
  FilterFieldOptions,
  FilterHeaderControlOptions,
  FilterHeaderRowProps,
  FilterTreeBuilderProps,
  HeaderFilterOptions,
} from "@adapttable/vue/adapter";

interface Person {
  id: string;
  name: string;
}
declare const field: FilterFieldOptions<Person>;
declare const checklist: ChecklistFilterProps<Person>;
declare const tree: FilterTreeBuilderProps<Person>;
declare const header: HeaderFilterOptions<Person>;
declare const headerControl: FilterHeaderControlOptions<Person>;
declare const headerRow: FilterHeaderRowProps<Person>;

export const fieldProps: Parameters<typeof NaiveFilterField<Person>>[0] = {
  ...field,
};
export const checklistProps: Parameters<typeof ChecklistFilter<Person>>[0] = {
  ...checklist,
};
export const treeProps: Parameters<typeof FilterTreeBuilder<Person>>[0] = {
  ...tree,
};
export const headerProps: Parameters<typeof NaiveHeaderFilter<Person>>[0] = {
  ...header,
};
export const headerControlProps: Parameters<
  typeof FilterHeaderControl<Person>
>[0] = { ...headerControl };
export const headerRowProps: Parameters<typeof FilterHeaderRow<Person>>[0] = {
  ...headerRow,
};
