import { coreColumnMenu, featureStateKey } from "@adapttable/core/binding";
import type { FeatureMountContext, StaticTableFeature } from "@adapttable/vue";
import { computed, watch } from "vue";

import {
  COLUMN_HEADER_RENAME,
  COLUMN_MENU,
  columnMenuSlotKey,
  type ColumnMenuSlotProps,
} from "../columns/columnMenuContracts";
import { filterViewKey, rowActionsModelKey } from "../layout/modelChannels";
import { toolbarEntry } from "./toolbarEntries";

/** What the column menu draws from, before the toolbar's presentation. */
type ColumnMenuEntryModel<TRow> = Omit<
  ColumnMenuSlotProps<TRow>,
  "labels" | "dir" | "classNames" | "container"
>;
function columnMenuModelKey<TRow>() {
  return featureStateKey<ColumnMenuEntryModel<TRow>>("vue-column-menu-model");
}

function useColumnMenuMount<TRow>(context: FeatureMountContext<TRow>): void {
  const { table } = context;
  const filterPanel = context.state.get(filterViewKey<TRow>());
  const rowActions = context.state.get(rowActionsModelKey<TRow>());
  const model = computed(() => {
    const openPanel = filterPanel.value?.openPanel;
    return {
      allColumns: table.allColumns.value,
      layout: table.layout.value,
      featureHost: context.featureHost.value,
      hasRowActions: rowActions.value?.hasRowActions,
      hasRowReorder: context.options.value.rowReorder === true,
      onAutoSize: () => table.autoSizeColumns(context.root.value),
      onAutoSizeColumn: (key: string) =>
        table.autoSizeColumn(context.root.value, key),
      onSortColumn: (key: string, dir: "asc" | "desc") =>
        context.source.value.setSort(key, dir),
      onRenameColumn: (key: string, name: string) =>
        table.layout.value.setName(key, name),
      onFilterColumn: openPanel ? () => openPanel() : undefined,
      sortBy: table.sortBy.value,
      sortDir: table.sortDir.value,
    };
  });
  watch(
    model,
    (value) => context.state.set(columnMenuModelKey<TRow>(), value),
    {
      immediate: true,
      flush: "sync",
    }
  );
}

/** Opt in to the kit's column manager and direct header rename controls. */
export function columnMenu(): StaticTableFeature {
  return {
    ...coreColumnMenu(),
    mount: useColumnMenuMount,
    renders: [
      toolbarEntry((entry) => {
        const model = entry.read(columnMenuModelKey<unknown>());
        return model
          ? entry.draw(columnMenuSlotKey<unknown>(), {
              ...model,
              ...entry.presentation,
            })
          : null;
      }),
    ],
    requiredSlots: [COLUMN_MENU, COLUMN_HEADER_RENAME],
  };
}
