import {
  activeFilterChips,
  FILTER_ENGINE_IMPL,
  type FilterDef,
  filterTreeChipLabel,
  type FilterTypeSpec,
  isFilterTreeConditionSet,
  removeFilterTreeNode,
  walkFilterTreeConditions,
} from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  coreFilters,
  coreFilterTypes,
  featureStateKey,
  FilterTriggerToggleState,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/binding";
import type {
  FeatureMountContext,
  StaticTableFeature,
  TableFeature,
} from "@adapttable/vue";
import { computed, onScopeDispose, shallowRef, toValue, watch } from "vue";

import type { FilterPanelModel } from "./filters/filterPanelChrome";
import {
  filterTreeSnapshot,
  sameFilterTree,
} from "./filters/filterTreeSnapshot";
import { FULLSCREEN_MODEL } from "./viewControls/contracts";
export const FILTER_VIEW =
  featureStateKey<FilterPanelModel<unknown>>("vue-filter-view");
export { filterViewKey } from "./layout/modelChannels";
import { filterViewKey } from "./layout/modelChannels";
function mountFilters<TRow>(context: FeatureMountContext<TRow>): void {
  const open = shallowRef(false);
  const fullscreen = context.state.get(FULLSCREEN_MODEL);
  let disposed = false;
  const mountedAnchor = shallowRef<HTMLElement | null>(null);
  onScopeDispose(() => {
    disposed = true;
    mountedAnchor.value = null;
  });
  const enabled = () => !disposed && context.active.value;
  const ownerRevision = shallowRef(0);
  const sourceOwner = () =>
    context.source.value.tableEngine ??
    context.source.value.setPage ??
    toValue(context.options.value.source) ??
    context.source.value;
  watch(
    [() => context.active.value, sourceOwner],
    ([live, owner], [, previousOwner]) => {
      if (!live || owner !== previousOwner) ownerRevision.value++;
    },
    { flush: "sync" }
  );
  // Child refs arrive before the parent activates. Registration is passive;
  // only the active feature may expose or act on the retained target.
  const anchor = computed(() => (enabled() ? mountedAnchor.value : null));
  const triggerRef = (element: HTMLElement | null) => {
    if (element === null || !disposed) mountedAnchor.value = element;
  };
  const toggle = new FilterTriggerToggleState();
  const close = (reason?: "escape" | "outside" | "done") => {
    if (!enabled()) return;
    open.value = false;
    if (reason === "escape") anchor.value?.focus();
  };
  const currentFieldChips = () =>
    activeFilterChips({
      values: context.table.source.value.extra,
      labels: context.filterRuntime.value?.filterLabels ?? {},
      onChange: (key, value) => context.table.source.value.setExtra(key, value),
    });
  const removeFieldChip = (key: string) => {
    currentFieldChips()
      .find((chip) => chip.key === key)
      ?.onRemove();
  };
  const model = computed<FilterPanelModel<TRow> | undefined>(() => {
    const runtime = context.filterRuntime.value;
    if (!runtime) return undefined;
    const source = context.table.source.value;
    const labels = context.table.labels.value;
    const fieldChips = currentFieldChips();
    const revision = ownerRevision.value;
    const owner = sourceOwner();
    const definitions = new Map(runtime.defs.map((def) => [def.key, def.type]));
    const owns = () =>
      enabled() &&
      ownerRevision.value === revision &&
      sourceOwner() === owner &&
      context.filterRuntime.value?.defs.length === definitions.size &&
      context.filterRuntime.value.defs.every(
        (def) => definitions.get(def.key) === def.type
      );
    const tree = source.filterTree;
    const treeKey = tree ? filterTreeSnapshot(tree) : undefined;
    const chips = [
      ...fieldChips.map((chip) => ({
        ...chip,
        onRemove: () => {
          if (!owns()) return;
          removeFieldChip(chip.key);
        },
      })),
      ...(tree && source.setFilterTree
        ? walkFilterTreeConditions(tree)
            // A condition still waiting for a value filters nothing.
            .filter(({ condition }) => isFilterTreeConditionSet(condition))
            .map(({ condition, path }) => ({
              key: `ft:${path.join(".")}:${condition.key}:${condition.op}`,
              label: filterTreeChipLabel(
                condition,
                runtime.defs,
                labels,
                runtime.registry
              ),
              onRemove: () => {
                const current = context.table.source.value;
                if (
                  owns() &&
                  current.filterTree &&
                  sameFilterTree(current.filterTree, treeKey)
                )
                  current.setFilterTree?.(
                    removeFilterTreeNode(current.filterTree, path)
                  );
              },
            }))
        : []),
    ];
    const count = chips.length;
    return {
      open: open.value,
      openPanel: () => {
        if (enabled()) open.value = true;
      },
      mode:
        context.options.value.filtersMode === "drawer" ? "drawer" : "popover",
      dir: context.table.dir.value,
      labels,
      count,
      chips,
      defs: runtime.defs,
      registry: runtime.registry,
      source,
      tree:
        context.options.value.filterTreeBuilder === true && source.setFilterTree
          ? { defs: runtime.defs, source, labels, registry: runtime.registry }
          : undefined,
      anchor: anchor.value,
      container: fullscreen.value?.container,
      close,
      clear: () => {
        if (owns()) context.table.clearFilters();
      },
      trigger: {
        label: labels.filters,
        count,
        attrs: {
          "aria-expanded": open.value,
          "aria-haspopup": "dialog",
          "data-adapttable-part": "filters-button",
        },
        triggerRef,
        onPointerDown: () => {
          if (enabled()) toggle.pointerDown(open.value);
        },
        onClick: () => {
          if (enabled() && toggle.click(open.value)) open.value = !open.value;
        },
      },
    };
  });
  watch(model, (value) => context.state.set(filterViewKey<TRow>(), value), {
    immediate: true,
    flush: "sync",
  });
}
export interface FiltersOptions {
  readonly mode?: "popover" | "drawer";
  /** Include the optional advanced AND/OR builder using the adapter's Tree slot. */
  readonly tree?: boolean;
}
export function filters<TRow>(
  defs: readonly FilterDef<TRow>[] = [],
  options: FiltersOptions = {}
): TableFeature<TRow> {
  const base = coreFilters<TRow>(defs);
  return {
    id: base.id,
    apply: () => ({
      filters: defs,
      filterEngine: FILTER_ENGINE_IMPL,
      filtersMode: options.mode,
      filterTreeBuilder: options.tree,
    }),
    mount: mountFilters,
    requiredSlots: [TOOLBAR_EXTRAS, ACTIVE_FILTER_CHIPS],
  };
}
export function filterTypes(
  specs: readonly FilterTypeSpec[]
): StaticTableFeature {
  return coreFilterTypes(specs);
}
export type { StaticTableFeature, TableFeature } from "./features/tableFeature";
export * from "./filters/checklistChrome";
export * from "./filters/filterChipsChrome";
export * from "./filters/filterFieldChrome";
export * from "./filters/filterModels";
export * from "./filters/filterPanelChrome";
export * from "./filters/filterTreeChrome";
export type {
  FilterDef,
  FilterFormSource,
  FilterOption,
  FilterRuntime,
  FilterTypeRegistry,
  FilterTypeSpec,
  TableLabels,
} from "@adapttable/core";
export {
  defaultFilterRegistry,
  filterLabel,
  filterWidgetKind,
} from "@adapttable/core";
export { resolveLabels } from "@adapttable/core";
