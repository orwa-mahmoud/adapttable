<script setup lang="ts" generic="TRow">
import {
  type ColumnLayoutState,
  type DataTableHandle,
  type TableDensity,
} from "@adapttable/vue";
import {
  type DataTableProps,
  type DataTableSlots,
  DataTableSurfaceChrome,
  defaultConfirm,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import {
  computed,
  h,
  onBeforeUnmount,
  onBeforeUpdate,
  shallowRef,
  watch,
} from "vue";

import { provideClassNames } from "./classNamesContext";
import { nativeCheckbox } from "./nativeCheckbox";
import { nativeColumnGroupToggle } from "./nativeColumnGroupToggle";
import { nativeHierarchyControls } from "./nativeHierarchyControls";
import {
  NATIVE_GROUP_ROW,
  nativeGroupRowSlotKey,
} from "./nativeHierarchyControlSlots";
import { NativeRowActions } from "./NativeRowActions";
import { nativeSurfaceControls } from "./nativeSurfaceControls";

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
const footerSlot = shallowRef(slots.footer);
onBeforeUpdate(() => {
  footerSlot.value = slots.footer;
});
const shell = useDataTableShell<TRow>(() => ({
  ...props,
  footer: footerSlot.value,
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
const { table } = shell;
const names = computed(() => props.classNames ?? {});
provideClassNames(() => names.value);
function controls(): TableChromeSlots<TRow> {
  return {
    SortButton: ({ attrs, content }) => h("button", attrs, [content]),
    SelectionCheckbox: ({ attrs }) => nativeCheckbox(attrs),
    ColumnGroupToggle: nativeColumnGroupToggle,
    ResizeHandle: ({ attrs }) => h("span", attrs),
    RowActions: ({ controls: actions }) =>
      h(NativeRowActions<TRow>, {
        controls: actions,
        layout: props.rowActionsLayout,
        label: table.labels.value.rowActionsMenu,
        classNames: names.value,
      }),
    ...nativeHierarchyControls<TRow>(),
    GroupRow: (props) => {
      if (!shell.slotFills.value.get(NATIVE_GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: native grouping rows require grouping() from @adapttable/vue-unstyled/grouping."
        );
      return renderFeatureSlot(
        nativeGroupRowSlotKey<TRow>(),
        shell.slotFills.value,
        props
      );
    },
    cell: slots.cell,
    header: slots.header,
    headerActions: slots.headerActions,
    footer: slots.footer,
  };
}
const rootElement = shallowRef<HTMLElement | null>(null);
const scrollElement = shallowRef<HTMLElement | null>(null);
const surface = {
  rootElement: () => rootElement.value,
  scrollElement: () => scrollElement.value,
};
watch([rootElement, scrollElement], () => shell.setSurface(surface), {
  immediate: true,
  flush: "sync",
});
onBeforeUnmount(() => {
  shell.setSurface(null);
});
defineExpose<DataTableHandle<TRow>>(shell.handle);
function setRootElement(element: HTMLElement | null): void {
  rootElement.value = element;
}
function setScrollElement(element: HTMLElement | null): void {
  scrollElement.value = element;
}
</script>

<template>
  <DataTableSurfaceChrome
    v-bind="$attrs"
    :model="shell"
    :options="props"
    :slots="nativeSurfaceControls(controls())"
    :content="slots"
    :root-ref="setRootElement"
    :scroll-ref="setScrollElement"
  />
</template>
