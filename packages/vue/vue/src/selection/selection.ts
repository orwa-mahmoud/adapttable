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
  watch,
} from "vue";

import {
  type MaybeRefOrGetterOptional,
  useExternalStore,
  useScopeActivity,
} from "../store";
import type { SelectionCheckboxAttrs } from "./checkboxControl";
export interface RowSelectionOptions<TRow> {
  /** Suspend selection requests without discarding the controlled or local value. */
  readonly enabled?: MaybeRefOrGetterOptional<boolean>;
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
  rowCheckboxAttrs(id: string): SelectionCheckboxAttrs;
  headerCheckboxAttrs(): SelectionCheckboxAttrs;
}
export function useRowSelection<TRow>(
  input: MaybeRefOrGetter<RowSelectionOptions<TRow>>
): RowSelection {
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  const enabled = computed(() => toValue(options.value.enabled) ?? true);
  const available = computed(() => active.value && enabled.value);
  const lifetime = shallowRef(0);
  watch(
    [active, enabled],
    ([live, allowed], [wasLive, wasAllowed]) => {
      if ((wasLive && !live) || (wasAllowed && !allowed)) lifetime.value++;
    },
    { flush: "sync" }
  );
  const own = shallowRef<ReadonlySet<string>>(
    new Set(options.value.defaultSelectedIds)
  );
  const controlled = computed(() => toValue(options.value.selectedIds));
  const selectedIds = computed(() =>
    controlled.value === undefined ? own.value : new Set(controlled.value)
  );
  let previousRows:
    | { readonly rows: readonly TRow[]; readonly ids: readonly string[] }
    | undefined;
  const visibleRows = computed(() => {
    const previous = previousRows;
    const rows = [...toValue(options.value.rows)];
    const rowKey = options.value.rowKey;
    const ids = rows.map((row) => rowKey(row));
    const current =
      previous?.rows.length === rows.length &&
      rows.every(
        (row, index) =>
          Object.is(row, previous.rows[index]) &&
          ids[index] === previous.ids[index]
      )
        ? previous
        : { rows, ids };
    previousRows = current;
    return current;
  });
  const visibleIds = computed(() => visibleRows.value.ids);
  const ownedAction = <TArgs extends unknown[]>(
    action: (...args: TArgs) => void
  ) => {
    const owner = visibleRows.value;
    const version = lifetime.value;
    const admitted = enabled.value;
    return (...args: TArgs): void => {
      if (
        admitted &&
        available.value &&
        version === lifetime.value &&
        owner === visibleRows.value
      )
        action(...args);
    };
  };
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
  watch(
    acrossPages,
    (enabled) => {
      if (!enabled) scope.narrow();
    },
    { immediate: true, flush: "sync" }
  );
  const commit = (next: ReadonlySet<string>): void => {
    if (!available.value) return;
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
    if (available.value) scope.select(acrossPages.value);
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
      visibleIds: [...visibleIds.value],
      allMatching: allMatching.value,
      acrossPages: acrossPages.value,
      isSelected,
      toggle: ownedAction(toggle),
      toggleAll: ownedAction(toggleAll),
      clear: ownedAction(clear),
      replace: ownedAction(replace),
      toggleGroupLeaves: ownedAction(toggleGroupLeaves),
      selectAllMatching: ownedAction(selectAllMatching),
    })),
    rowCheckboxAttrs: (id) => ({
      type: "checkbox",
      "aria-label": labels.value.selectRow,
      checked: isSelected(id),
      ...(!enabled.value ? { disabled: true } : {}),
      onChange: ownedAction(() => toggle(id)),
    }),
    headerCheckboxAttrs: () => ({
      type: "checkbox",
      "aria-label": labels.value.selectAll,
      checked: headerState.value === "all",
      indeterminate: headerState.value === "some",
      ...(!enabled.value ? { disabled: true } : {}),
      onChange: ownedAction(toggleAll),
    }),
  };
}
