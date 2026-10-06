<script setup lang="ts" generic="TRow">
import "./styles.css";

import type {
  ColumnLayoutState,
  DataTableHandle,
  TableDensity,
} from "@adapttable/vue";
import {
  DataTableSurfaceChrome,
  defaultConfirm,
  GROUP_ROW,
  groupRowSlotKey,
  provideDataTableClassNames,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import {
  computed,
  h,
  mergeProps,
  onBeforeUnmount,
  onBeforeUpdate,
  shallowRef,
  useAttrs,
  watch,
} from "vue";

import { naiveClassNames } from "./classNames";
import { naiveTableControls } from "./controls/table";
import NaiveRowActions from "./NaiveRowActions.vue";
import { naiveSurfaceControls } from "./surface";
import { naiveDirection, useNaiveTableStyle } from "./theme";
import type { DataTableProps, DataTableSlots } from "./types";

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
const attrs = useAttrs();
const slots = defineSlots<DataTableSlots<TRow>>();
const footer = shallowRef(slots.footer);
onBeforeUpdate(() => {
  footer.value = slots.footer;
});
const names = computed(() => naiveClassNames(props.classNames));
provideDataTableClassNames(() => names.value);
const shell = useDataTableShell<TRow>(() => ({
  ...props,
  footer: footer.value,
  confirm: props.confirm ?? defaultConfirm,
  onDensityChange: (density) => {
    props.onDensityChange?.(density);
    emit("update:density", density);
  },
  onSelectionChange:
    props.selectable ||
    props.selectedIds !== undefined ||
    props.defaultSelectedIds !== undefined
      ? (ids) => emit("update:selectedIds", ids)
      : undefined,
  onColumnLayoutChange: (layout) => emit("update:columnLayout", layout),
}));
const root = shallowRef<HTMLElement | null>(null);
const scroll = shallowRef<HTMLElement | null>(null);
watch(
  [root, scroll],
  () =>
    shell.setSurface({
      rootElement: () => root.value,
      scrollElement: () => scroll.value,
    }),
  { immediate: true, flush: "sync" }
);
onBeforeUnmount(() => shell.setSurface(null));
defineExpose<DataTableHandle<TRow>>(shell.handle);
const style = useNaiveTableStyle();
function controls(): TableChromeSlots<TRow> {
  return {
    ...naiveTableControls<TRow>(),
    RowActions: ({ controls: actions }) =>
      h(NaiveRowActions<TRow>, {
        controls: actions,
        layout: props.rowActionsLayout,
        label: shell.table.labels.value.rowActionsMenu,
        dir: shell.table.dir.value,
        classNames: names.value,
      }),
    GroupRow: (group) => {
      if (!shell.slotFills.value.get(GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable Naive UI: grouped rows require the kit grouping contribution."
        );
      return renderFeatureSlot(
        groupRowSlotKey<TRow>(),
        shell.slotFills.value,
        group
      );
    },
    cell: slots.cell,
    header: slots.header,
    headerActions: slots.headerActions,
    footer: slots.footer,
  };
}
const Render = () =>
  naiveDirection(shell.table.dir.value, () =>
    h(DataTableSurfaceChrome<TRow>, {
      ...mergeProps(attrs, { class: "adapttable-naive", style: style.value }),
      model: shell,
      options: { ...props, classNames: names.value },
      slots: naiveSurfaceControls(controls(), shell.density.value),
      content: slots,
      rootRef: (element: HTMLElement | null) => {
        root.value = element;
      },
      scrollRef: (element: HTMLElement | null) => {
        scroll.value = element;
      },
    })
  );
</script>

<template>
  <Render />
</template>
