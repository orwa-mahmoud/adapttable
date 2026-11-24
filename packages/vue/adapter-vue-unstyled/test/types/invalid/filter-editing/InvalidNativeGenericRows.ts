import type {
  BatchEditBarProps,
  ChecklistFilterProps,
  FilterFieldOptions,
  FilterTreeBuilderProps,
  HeaderFilterOptions,
  RowEditActionsProps,
  VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { type ChecklistFilter as NativeChecklistFilter, type FilterTreeBuilder as NativeFilterTree, type NativeFilterField } from "@adapttable/vue-unstyled/filters";
import { type NativeBatchEditBar, type NativeEditableCell, type NativeRowEditActions } from "@adapttable/vue-unstyled/editing";
import { type NativeHeaderFilter } from "@adapttable/vue-unstyled/header-filters";

interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
declare const cell: VueEditableCellProps<Invoice>;
declare const row: RowEditActionsProps<Invoice>;
declare const batch: BatchEditBarProps<Invoice>;
declare const field: FilterFieldOptions<Invoice>;
declare const checklist: ChecklistFilterProps<Invoice>;
declare const tree: FilterTreeBuilderProps<Invoice>;
declare const header: HeaderFilterOptions<Invoice>;

export const wrongCell: Parameters<typeof NativeEditableCell<Person>>[0] = cell;
export const wrongRow: Parameters<typeof NativeRowEditActions<Person>>[0] = row;
export const wrongBatch: Parameters<typeof NativeBatchEditBar<Person>>[0] =
  batch;
export const wrongField: Parameters<typeof NativeFilterField<Person>>[0] =
  field;
export const wrongChecklist: Parameters<
  typeof NativeChecklistFilter<Person>
>[0] = checklist;
export const wrongTree: Parameters<typeof NativeFilterTree<Person>>[0] = tree;
export const wrongHeader: Parameters<typeof NativeHeaderFilter<Person>>[0] =
  header;
