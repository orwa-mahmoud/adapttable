/** Selection remains a host-controlled value when selectedIds is supplied. */
import {
  applyGroupLeafSelection,
  createAllMatchingScope,
  headerSelectionOf,
  resolveLabels,
  type TableLabels,
  toggleId,
  toggleIds,
} from "@adapttable/core";
import type {
  HeaderSelectionState,
  SelectionState,
} from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  shallowRef,
  toValue,
} from "vue";

import { type Attrs, toVueAttrs } from "../attrs";
import { type MaybeRefOrGetterOptional, useExternalStore } from "../store";
export interface RowSelectionOptions<TRow> {
  readonly rows: MaybeRefOrGetter<readonly TRow[]>;
  readonly rowKey: (row: TRow) => string;
  readonly selectedIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultSelectedIds?: readonly string[];
  readonly onSelectionChange?: (ids: string[]) => void;
  readonly labels?: MaybeRefOrGetterOptional<TableLabels>;
  readonly acrossPages?: MaybeRefOrGetter<boolean>;
}
export interface RowSelection {
  readonly selectedIds: ComputedRef<ReadonlySet<string>>;
  readonly selectedCount: ComputedRef<number>;
  readonly headerState: ComputedRef<HeaderSelectionState>;
  readonly allMatching: Readonly<{ readonly value: boolean }>;
  readonly state: ComputedRef<SelectionState>;
  isSelected(id: string): boolean;
  toggle(id: string): void;
  toggleAll(): void;
  clear(): void;
  replace(this: void, ids: readonly string[] | undefined): void;
  toggleGroupLeaves(ids: readonly string[]): void;
  selectAllMatching(): void;
  rowCheckboxAttrs(id: string): Attrs;
  headerCheckboxAttrs(): Attrs;
}
export function useRowSelection<TRow>(
  input: MaybeRefOrGetter<RowSelectionOptions<TRow>>
): RowSelection {
  const options = computed(() => toValue(input));
  const own = shallowRef<ReadonlySet<string>>(
    new Set(options.value.defaultSelectedIds)
  );
  const controlled = computed(() => toValue(options.value.selectedIds));
  const selectedIds = computed(() =>
    controlled.value === undefined ? own.value : new Set(controlled.value)
  );
  const visibleIds = computed(() =>
    toValue(options.value.rows).map(options.value.rowKey)
  );
  const headerState = computed(() =>
    headerSelectionOf(visibleIds.value, selectedIds.value)
  );
  const labels = computed(() =>
    resolveLabels(toValue<TableLabels | undefined>(options.value.labels))
  );
  const scope = createAllMatchingScope();
  const allMatching = useExternalStore(scope);
  const acrossPages = computed(
    () => toValue(options.value.acrossPages) ?? false
  );
  const commit = (next: ReadonlySet<string>): void => {
    scope.narrow();
    if (controlled.value === undefined) own.value = next;
    options.value.onSelectionChange?.([...next]);
  };
  const isSelected = (id: string): boolean => selectedIds.value.has(id);
  const toggle = (id: string): void => commit(toggleId(selectedIds.value, id));
  const toggleAll = (): void =>
    commit(toggleIds(selectedIds.value, visibleIds.value));
  const clear = (): void => commit(new Set());
  const replace = (ids: readonly string[] | undefined): void =>
    commit(new Set(ids));
  const toggleGroupLeaves = (ids: readonly string[]): void =>
    commit(applyGroupLeafSelection(ids, selectedIds.value));
  const selectAllMatching = (): void => {
    scope.select(acrossPages.value);
  };
  return {
    selectedIds,
    selectedCount: computed(() => selectedIds.value.size),
    headerState,
    allMatching,
    isSelected,
    toggle,
    toggleAll,
    clear,
    replace,
    toggleGroupLeaves,
    selectAllMatching,
    state: computed(() => ({
      selectedIds: selectedIds.value,
      selectedCount: selectedIds.value.size,
      headerState: headerState.value,
      visibleIds: visibleIds.value,
      allMatching: allMatching.value,
      acrossPages: acrossPages.value,
      isSelected,
      toggle,
      toggleAll,
      clear,
      replace,
      toggleGroupLeaves,
      selectAllMatching,
    })),
    rowCheckboxAttrs: (id) =>
      toVueAttrs({
        type: "checkbox",
        "aria-label": labels.value.selectRow,
        checked: isSelected(id),
        onChange: () => toggle(id),
      }),
    headerCheckboxAttrs: () =>
      toVueAttrs({
        type: "checkbox",
        "aria-label": labels.value.selectAll,
        checked: headerState.value === "all",
        indeterminate: headerState.value === "some",
        onChange: toggleAll,
      }),
  };
}
