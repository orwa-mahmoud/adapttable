import { FILTER_ENGINE_IMPL, filterDefForColumn } from "@adapttable/core";
import { coreHeaderFilters, FILTER_HEADER } from "@adapttable/core/binding";
import { computed, watch } from "vue";

import type {
  FeatureMountContext,
  StaticTableFeature,
} from "./features/tableFeature";
import {
  headerFilterModelKey,
  type VueHeaderFilterControlProps,
} from "./layout/modelChannels";
function mountHeaderFilters<TRow>(context: FeatureMountContext<TRow>): void {
  const controls = computed(() => {
    const map = new Map<string, VueHeaderFilterControlProps<TRow>>();
    const runtime = context.filterRuntime.value;
    if (!runtime) return map;
    for (const column of context.table.columns.value) {
      const def = filterDefForColumn(runtime.defs, column.key);
      if (def)
        map.set(column.key, {
          def,
          source: context.table.source.value,
          registry: runtime.registry,
          labels: context.table.labels.value,
          dir: context.table.dir.value,
          closeOnSelect:
            context.options.value.closeHeaderFilterOnSelect === true,
        });
    }
    return map;
  });
  watch(
    controls,
    (value) =>
      context.state.set(headerFilterModelKey<TRow>(), { controls: value }),
    { immediate: true, flush: "sync" }
  );
}
export function headerFilters(): StaticTableFeature {
  return {
    ...coreHeaderFilters(),
    apply: () => ({ headerFilters: true, filterEngine: FILTER_ENGINE_IMPL }),
    mount: mountHeaderFilters,
    requiredSlots: [FILTER_HEADER],
  };
}
export type { StaticTableFeature } from "./features/tableFeature";
export type { FilterFieldOptions } from "./filters/filterFieldChrome";
export type {
  FilterPanelSurfaceProps,
  FilterTriggerProps,
} from "./filters/filterPanelChrome";
export * from "./filters/headerFilterChrome";
export type {
  HeaderFilterModel,
  VueHeaderFilterControlProps,
} from "./layout/modelChannels";
export {
  headerFilterModelKey,
  headerFilterSlotKey,
} from "./layout/modelChannels";

/** Public feature signatures share the binding's nameable member types. */
export type * from "./index";

/** Preserve the existing core type-only surface through declaration bundling. */
export type * from "@adapttable/core";
