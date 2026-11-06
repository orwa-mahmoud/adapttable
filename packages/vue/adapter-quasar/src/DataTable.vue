<script setup lang="ts" generic="TRow">
import type {
  ColumnLayoutState,
  DataTableHandle,
  TableDensity,
} from "@adapttable/vue";
import {
  type DataTableProps,
  type DataTableSlots,
  DataTableSurfaceChrome,
  defaultConfirm,
  GROUP_ROW,
  groupRowSlotKey,
  provideDataTableClassNames,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
  withKitEnvironment,
} from "@adapttable/vue/adapter";
import {
  computed,
  onBeforeUnmount,
  onBeforeUpdate,
  shallowRef,
  watch,
} from "vue";

import { useQuasarLibrary } from "./libraryEnvironment";
import { ROW_ACTIONS_CONTROL, rowActionsControlKey } from "./rowActionsSlot";
import { quasarTableControls } from "./table/controls";
import { quasarSurfaceControls } from "./table/surface";

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<DataTableProps<TRow>>(), {
  searchable: true,
  forceMobile: undefined,
  urlSync: undefined,
  selectable: undefined,
  multiSort: undefined,
  fitColumns: undefined,
  collapsibleColumnGroups: undefined,
  isLoading: undefined,
  isFetching: undefined,
});
const emit = defineEmits<{
  "update:selectedIds": [ids: string[]];
  "update:columnLayout": [layout: ColumnLayoutState];
  "update:density": [density: TableDensity];
}>();
const slots = defineSlots<DataTableSlots<TRow>>();
const footer = shallowRef(slots.footer);
onBeforeUpdate(() => {
  footer.value = slots.footer;
});
const kit = useQuasarLibrary();
const shell = useDataTableShell<TRow>(() =>
  withKitEnvironment(
    {
      ...props,
      footer: footer.value,
      confirm: props.confirm ?? defaultConfirm,
      onDensityChange: (density: TableDensity) => {
        props.onDensityChange?.(density);
        emit("update:density", density);
      },
      onSelectionChange:
        props.selectable ||
        props.selectedIds !== undefined ||
        props.defaultSelectedIds !== undefined
          ? (ids: string[]) => emit("update:selectedIds", ids)
          : undefined,
      onColumnLayoutChange: (layout: ColumnLayoutState) =>
        emit("update:columnLayout", layout),
    },
    kit.value
  )
);
const names = computed(() => props.classNames ?? {});
provideDataTableClassNames(() => names.value);
function controls(): TableChromeSlots<TRow> {
  return {
    ...quasarTableControls<TRow>(),
    RowActions: ({ controls: actions }) => {
      if (!shell.slotFills.value.get(ROW_ACTIONS_CONTROL.id)?.length)
        throw new Error(
          "AdaptTable: Quasar row actions require rowActions() or rowPinning() from @adapttable/quasar."
        );
      return renderFeatureSlot(
        rowActionsControlKey<TRow>(),
        shell.slotFills.value,
        {
          controls: actions,
          layout: props.rowActionsLayout,
          label: shell.table.labels.value.rowActionsMenu,
          classNames: names.value,
        }
      );
    },
    GroupRow: (props) => {
      if (!shell.slotFills.value.get(GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: Quasar group rows require grouping() from @adapttable/quasar/grouping."
        );
      return renderFeatureSlot(
        groupRowSlotKey<TRow>(),
        shell.slotFills.value,
        props
      );
    },
    card: slots.card,
    cell: slots.cell,
    header: slots.header,
    headerActions: slots.headerActions,
    footer: slots.footer,
  };
}
const root = shallowRef<HTMLElement | null>(null);
const scroll = shallowRef<HTMLElement | null>(null);
const surface = {
  rootElement: () => root.value,
  scrollElement: () => scroll.value,
};
watch([root, scroll], () => shell.setSurface(surface), {
  immediate: true,
  flush: "sync",
});
onBeforeUnmount(() => shell.setSurface(null));
defineExpose<DataTableHandle<TRow>>(shell.handle);
function setRoot(element: HTMLElement | null): void {
  root.value = element;
}
function setScroll(element: HTMLElement | null): void {
  scroll.value = element;
}
</script>

<template>
  <DataTableSurfaceChrome
    v-bind="$attrs"
    class="adapttable-quasar"
    :model="shell"
    :options="props"
    :slots="quasarSurfaceControls(controls())"
    :content="slots"
    :root-ref="setRoot"
    :scroll-ref="setScroll"
  />
</template>
