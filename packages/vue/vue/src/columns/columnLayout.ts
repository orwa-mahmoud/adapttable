/** Vue projection of core's controllable column layout. */
import {
  type ColumnGroupRecord,
  type ColumnLayoutState,
  columnLayoutVisibleColumns,
  columnPinInsets,
  createColumnLayoutController,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
  toValue,
  watchEffect,
} from "vue";

import type { ColumnDef } from "../columnDef";
import { type MaybeRefOrGetterOptional, useExternalStore } from "../store";
export interface ColumnLayoutOptions {
  readonly columnLayout?: MaybeRefOrGetterOptional<ColumnLayoutState>;
  readonly defaultColumnLayout?: Partial<ColumnLayoutState>;
  readonly onColumnLayoutChange?: (next: ColumnLayoutState) => void;
  readonly onColumnRename?: (key: string, name: string) => void;
}
export type ColumnLayout<TRow> = Omit<
  UseColumnLayoutResult<TRow>,
  "visibleColumns"
> & {
  readonly visibleColumns: readonly ColumnDef<TRow>[];
};
export function useColumnLayout<TRow>(
  columns: MaybeRefOrGetter<readonly ColumnDef<TRow>[]>,
  options: MaybeRefOrGetter<ColumnLayoutOptions>,
  groups?: MaybeRefOrGetter<ReadonlyMap<string, ColumnGroupRecord<TRow>>>,
  collapsible?: MaybeRefOrGetter<boolean>
): ComputedRef<ColumnLayout<TRow>> {
  const controller = createColumnLayoutController<TRow, ColumnDef<TRow>>(
    toValue(options).defaultColumnLayout
  );
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const controlled = computed(() => toValue(toValue(options).columnLayout));
  const reconcile = (): void => {
    const current = toValue(options);
    controller.store.control({
      value: controlled.value,
      onChange: (next) => {
        current.onColumnLayoutChange?.(next);
        void nextTick(() => {
          if (!disposed) reconcile();
        });
      },
    });
    controller.configure({
      columns: toValue(columns),
      onColumnRename: current.onColumnRename,
      columnGroups: groups ? toValue(groups) : undefined,
      collapsibleColumnGroups: collapsible ? toValue(collapsible) : false,
    });
  };
  watchEffect(reconcile, { flush: "sync" });
  const own = useExternalStore(controller.store);
  const state = computed(() => controlled.value ?? own.value);
  const visibleColumns = computed(() =>
    columnLayoutVisibleColumns(toValue(columns), state.value, {
      columnGroups: groups ? toValue(groups) : undefined,
      collapsibleColumnGroups: collapsible ? toValue(collapsible) : false,
    })
  );
  return computed(() => {
    const current = state.value;
    const visible = visibleColumns.value;
    let insets: ReturnType<typeof columnPinInsets> | undefined;
    return {
      state: current,
      visibleColumns: visible,
      isHidden: (key) => current.hidden.includes(key),
      pinOffset: (key) => {
        insets ??= columnPinInsets(visible, current);
        return insets.get(key);
      },
      setHidden: controller.setHidden,
      toggleVisible: controller.toggleVisible,
      setPinned: controller.setPinned,
      setWidth: controller.setWidth,
      setName: controller.setName,
      resetName: controller.resetName,
      move: controller.move,
      setOrder: controller.setOrder,
      reset: controller.reset,
      toggleColumnGroup: controller.toggleColumnGroup,
    };
  });
}
