import {
  activeFilterChips,
  FILTER_ENGINE_IMPL,
  type FilterDef,
  type FilterTypeSpec,
  walkFilterTreeConditions,
} from "@adapttable/core";
import {
  coreFilters,
  coreFilterTypes,
  featureStateKey,
  FilterTriggerToggleState,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/binding";
import { computed, onScopeDispose, shallowRef, watch } from "vue";

import type {
  FeatureMountContext,
  StaticTableFeature,
  TableFeature,
} from "./features/tableFeature";
import type { FilterPanelModel } from "./filters/filterPanelChrome";
import { FULLSCREEN_MODEL } from "./viewControls/contracts";
export const FILTER_VIEW =
  featureStateKey<FilterPanelModel<unknown>>("vue-filter-view");
export { filterViewKey } from "./layout/modelChannels";
import { filterViewKey } from "./layout/modelChannels";
function mountFilters<TRow>(context: FeatureMountContext<TRow>): void {
  const open = shallowRef(false);
  const fullscreen = context.state.get(FULLSCREEN_MODEL);
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const enabled = () => !disposed && context.active.value;
  const anchor = shallowRef<HTMLElement | null>(null);
  const toggle = new FilterTriggerToggleState();
  const close = (reason?: "escape" | "outside" | "done") => {
    if (!enabled()) return;
    open.value = false;
    if (reason === "escape") anchor.value?.focus();
  };
  const model = computed<FilterPanelModel<TRow> | undefined>(() => {
    const runtime = context.filterRuntime.value;
    if (!runtime) return undefined;
    const source = context.table.source.value;
    const labels = context.table.labels.value;
    const fieldCount = activeFilterChips({
      values: source.extra,
      labels: runtime.filterLabels,
      onChange: source.setExtra,
    }).length;
    const treeCount =
      source.filterTree && source.setFilterTree
        ? walkFilterTreeConditions(source.filterTree).length
        : 0;
    const count = fieldCount + treeCount;
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
        if (enabled()) context.table.clearFilters();
      },
      trigger: {
        label: labels.filters,
        count,
        attrs: {
          "aria-expanded": open.value,
          "aria-haspopup": "dialog",
          "data-adapttable-part": "filters-button",
        },
        triggerRef: (element) => {
          if (enabled()) anchor.value = element;
        },
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
    requiredSlots: [TOOLBAR_EXTRAS],
  };
}
export function filterTypes(
  specs: readonly FilterTypeSpec[]
): StaticTableFeature {
  return coreFilterTypes(specs);
}
export type { StaticTableFeature, TableFeature } from "./features/tableFeature";
export * from "./filters/checklistChrome";
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

/** Public feature signatures share the binding's nameable member types. */
export type * from "./index";

/** Preserve the existing core type-only surface through declaration bundling. */
export type * from "@adapttable/core";
