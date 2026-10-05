import type {
  BatchEditBarProps,
  RowEditActionsProps,
  VueEditableCellProps,
} from "@adapttable/vue/editing";
import type {
  ChecklistFilterProps,
  FilterFieldOptions,
  FilterTreeBuilderProps,
} from "@adapttable/vue/filters";
import type { HeaderFilterOptions } from "@adapttable/vue/header-filters";
import {
  type NativeBatchEditBar,
  type NativeChecklistFilter,
  type NativeEditableCell,
  type NativeFilterField,
  type NativeFilterTree,
  type NativeHeaderFilter,
  type NativeRowEditActions,
} from "@adapttable/vue-unstyled/features";

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
