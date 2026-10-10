/** Vue lifecycle over the neutral filter widgets. No control renders here. */
import {
  type BooleanFieldWidget,
  booleanFilterWidget,
  CHECKLIST_VIRTUALIZE_AT,
  checklistActions,
  checklistItems,
  type ChecklistSource,
  defaultFilterRegistry,
  type FilterDef,
  type FilterFormSource,
  type FilterOption,
  filterTreeEditorActions,
  type FilterTypeRegistry,
  initialRangeFilterOp,
  initialTextFilterOp,
  listFilterValues,
  type QueryFilterGroup,
  type RangeFieldWidget,
  rangeFilterWidget,
  type RangeOp,
  searchChecklistItems,
  type TableSource,
  type TextFieldWidget,
  textFilterWidget,
  type TextOp,
} from "@adapttable/core";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { requireScope, useScopeActivity } from "../store";
import { useFilterActionOwner } from "./filterActionOwner";

export function useTextFilter<TRow>(
  definition: MaybeRefOrGetter<FilterDef<TRow>>,
  input: MaybeRefOrGetter<FilterFormSource<TRow>>
): ComputedRef<TextFieldWidget> {
  requireScope("useTextFilter");
  const owner = useFilterActionOwner(definition, input);
  const chosen = shallowRef<TextOp>();
  watch(
    () => toValue(definition).key,
    () => {
      chosen.value = undefined;
    },
    { flush: "sync" }
  );
  return computed(() => {
    const def = toValue(definition);
    const own = owner.value;
    const source = own.source;
    return textFilterWidget(
      def,
      source,
      chosen.value ?? initialTextFilterOp(def, source.extra),
      (op) => {
        if (own.allowed()) chosen.value = op;
      }
    );
  });
}
export function useRangeFilter<TRow>(
  definition: MaybeRefOrGetter<FilterDef<TRow>>,
  input: MaybeRefOrGetter<FilterFormSource<TRow>>
): ComputedRef<RangeFieldWidget> {
  requireScope("useRangeFilter");
  const owner = useFilterActionOwner(definition, input);
  const chosen = shallowRef<RangeOp | null>();
  watch(
    () => toValue(definition).key,
    () => {
      chosen.value = undefined;
    },
    { flush: "sync" }
  );
  return computed(() => {
    const def = toValue(definition);
    const own = owner.value;
    const source = own.source;
    const op =
      chosen.value === undefined
        ? initialRangeFilterOp(def, source.extra)
        : (chosen.value ?? undefined);
    return {
      ...rangeFilterWidget(def, source, op),
      setOp: (next: RangeOp | undefined) => {
        if (own.allowed()) chosen.value = next ?? null;
      },
    };
  });
}
export function useBooleanFilter<TRow>(
  definition: MaybeRefOrGetter<FilterDef<TRow>>,
  input: MaybeRefOrGetter<FilterFormSource<TRow>>
): ComputedRef<BooleanFieldWidget> {
  const owner = useFilterActionOwner(definition, input);
  return computed(() =>
    booleanFilterWidget(toValue(definition), owner.value.source)
  );
}
export interface FilterOptionsState {
  readonly options: readonly FilterOption[];
  readonly loading: boolean;
  readonly error?: unknown;
}
/** A replaced loader cannot publish into its successor, and SSR starts no load. */
export function useFilterOptions<TRow>(
  definition: MaybeRefOrGetter<FilterDef<TRow>>
): ComputedRef<FilterOptionsState> {
  requireScope("useFilterOptions");
  const active = useScopeActivity();
  const loaded = shallowRef<FilterOptionsState>({
    options: [],
    loading: false,
  });
  watch(
    [() => toValue(definition).options, active],
    ([options, enabled], _previous, cleanup) => {
      let current = true;
      cleanup(() => {
        current = false;
      });
      if (typeof options !== "function") {
        loaded.value = {
          options: Array.isArray(options) ? options : [],
          loading: false,
        };
        return;
      }
      loaded.value = { options: [], loading: enabled };
      if (!enabled) return;
      Promise.resolve()
        .then(() => (current ? options() : []))
        .then(
          (value) => {
            if (current) loaded.value = { options: value, loading: false };
          },
          (error) => {
            if (current) loaded.value = { options: [], loading: false, error };
          }
        );
    },
    { immediate: true, flush: "sync" }
  );
  return computed(() => loaded.value);
}
export function useChecklistFilter<TRow>(
  definition: MaybeRefOrGetter<FilterDef<TRow>>,
  input: MaybeRefOrGetter<ChecklistSource<TRow>>
) {
  requireScope("useChecklistFilter");
  const owner = useFilterActionOwner(definition, input);
  const query = shallowRef("");
  return computed(() => {
    const def = toValue(definition);
    const own = owner.value;
    const source = own.source;
    const checklistSource = { ...toValue(input), ...source };
    const { available, items } = checklistItems(def, checklistSource);
    const visible = searchChecklistItems(items, query.value);
    return {
      available,
      items,
      visible,
      query: query.value,
      selected: listFilterValues(source.extra[def.key]),
      virtualize: visible.length >= CHECKLIST_VIRTUALIZE_AT,
      setQuery: (value: string) => {
        if (own.allowed()) query.value = value;
      },
      ...checklistActions(def, checklistSource, visible),
    };
  });
}
export interface FilterTreeOptions<TRow> {
  readonly defs: readonly FilterDef<TRow>[];
  readonly source: Pick<TableSource<TRow>, "filterTree" | "setFilterTree">;
  readonly registry?: FilterTypeRegistry;
  readonly defaultExpanded?: boolean;
}
export function useFilterTree<TRow>(
  input: MaybeRefOrGetter<FilterTreeOptions<TRow>>
) {
  requireScope("useFilterTree");
  const active = useScopeActivity();
  const expanded = shallowRef(
    toValue(input).defaultExpanded ?? !!toValue(input).source.filterTree
  );
  const currentActions = computed(() => {
    const options = toValue(input);
    const write = options.source.setFilterTree;
    if (!write)
      throw new Error(
        "AdaptTable: this source does not support filter-tree writes."
      );
    const first = options.defs[0];
    if (!first)
      throw new Error(
        "AdaptTable: a filter tree requires at least one filter definition."
      );
    return filterTreeEditorActions(
      options.source.filterTree,
      (tree) => {
        if (active.value) toValue(input).source.setFilterTree?.(tree);
      },
      first,
      options.registry ?? defaultFilterRegistry
    );
  });
  return {
    expanded: computed(() => expanded.value),
    setExpanded: (value: boolean) => {
      if (active.value) expanded.value = value;
    },
    tree: computed<QueryFilterGroup | undefined>(
      () => toValue(input).source.filterTree
    ),
    actions: computed(() => ({
      addCondition: (path: readonly number[]) => {
        if (active.value) currentActions.value.addCondition(path);
      },
      addGroup: (path: readonly number[]) => {
        if (active.value) currentActions.value.addGroup(path);
      },
      setCombinator: (path: readonly number[], next: string) => {
        if (active.value) currentActions.value.setCombinator(path, next);
      },
      replace: (
        path: readonly number[],
        next: Parameters<typeof currentActions.value.replace>[1]
      ) => {
        if (active.value) currentActions.value.replace(path, next);
      },
      remove: (path: readonly number[]) => {
        if (active.value) currentActions.value.remove(path);
      },
    })),
  };
}
