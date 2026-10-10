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
interface Invoice {
  id: string;
  amount: number;
}
declare const field: FilterFieldOptions<Invoice>;
declare const checklist: ChecklistFilterProps<Invoice>;
declare const tree: FilterTreeBuilderProps<Invoice>;
declare const header: HeaderFilterOptions<Invoice>;
declare const headerControl: FilterHeaderControlOptions<Invoice>;
declare const headerRow: FilterHeaderRowProps<Invoice>;

export const fieldProps: Parameters<typeof NaiveFilterField<Person>>[0] = field;
export const checklistProps: Parameters<typeof ChecklistFilter<Person>>[0] =
  checklist;
export const treeProps: Parameters<typeof FilterTreeBuilder<Person>>[0] = tree;
export const headerProps: Parameters<typeof NaiveHeaderFilter<Person>>[0] =
  header;
export const headerControlProps: Parameters<
  typeof FilterHeaderControl<Person>
>[0] = headerControl;
export const headerRowProps: Parameters<typeof FilterHeaderRow<Person>>[0] =
  headerRow;
