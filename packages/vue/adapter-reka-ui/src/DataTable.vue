<script setup lang="ts" generic="TRow">
import "./styles.css";

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
  FULLSCREEN_MODEL,
  GROUP_ROW,
  groupRowSlotKey,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { ConfigProvider } from "reka-ui";
import {
  computed,
  h,
  onBeforeUnmount,
  onBeforeUpdate,
  shallowRef,
  watch,
} from "vue";

import { provideRekaClasses } from "./context";
import { rekaButton } from "./controls/basic";
import { rekaSelectionCheckbox } from "./controls/checkbox";
import { provideRekaPortalContainer } from "./controls/portal";
import { RekaRowActions } from "./controls/RekaRowActions";
import { rekaSurfaceControls } from "./surfaceControls";
import {
  rekaColumnGroupToggle,
  rekaHierarchyControls,
  rekaResizeHandle,
} from "./tableControls";

// The binding owns the table state. This component only chooses Reka paint.
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
const content = defineSlots<DataTableSlots<TRow>>();
const footer = shallowRef(content.footer);
onBeforeUpdate(() => {
  footer.value = content.footer;
});
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
const names = computed(() => ({
  ...props.classNames,
  root: ["at-reka", props.classNames?.root].filter(Boolean).join(" "),
}));
provideRekaClasses(() => names.value);
const fullscreen = shell.state.get(FULLSCREEN_MODEL);
provideRekaPortalContainer(() => fullscreen.value?.container);
const options = computed(() => ({ ...props, classNames: names.value }));
function controls(): TableChromeSlots<TRow> {
  return {
    SortButton: ({ attrs, content }) => rekaButton(attrs, content),
    SelectionCheckbox: rekaSelectionCheckbox,
    ColumnGroupToggle: rekaColumnGroupToggle,
    ResizeHandle: rekaResizeHandle,
    RowActions: ({ controls }) =>
      h(RekaRowActions<TRow>, {
        controls,
        layout: props.rowActionsLayout,
        label: shell.table.labels.value.rowActionsMenu,
        classNames: names.value,
      }),
    ...rekaHierarchyControls<TRow>(),
    GroupRow: (control) => {
      if (!shell.slotFills.value.get(GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: Reka group rows require grouping() from @adapttable/reka-ui/grouping."
        );
      return renderFeatureSlot(
        groupRowSlotKey<TRow>(),
        shell.slotFills.value,
        control
      );
    },
    cell: content.cell,
    header: content.header,
    headerActions: content.headerActions,
    footer: content.footer,
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
onBeforeUnmount(() => shell.setSurface(null));
const rootRef = (element: HTMLElement | null) => {
  rootElement.value = element;
};
const scrollRef = (element: HTMLElement | null) => {
  scrollElement.value = element;
};
defineExpose<DataTableHandle<TRow>>(shell.handle);
</script>

<template>
  <ConfigProvider :dir="shell.table.dir.value">
    <DataTableSurfaceChrome
      v-bind="$attrs"
      data-adapttable-kit="reka-ui"
      :model="shell"
      :options="options"
      :slots="rekaSurfaceControls(controls())"
      :content="content"
      :root-ref="rootRef"
      :scroll-ref="scrollRef"
    />
  </ConfigProvider>
</template>
