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
import { elementButton } from "./controls/button";
import { elementSelectionCheckbox } from "./controls/checkbox";
import { elementConfirm } from "./elementConfirm";
import {
  elementColumnGroupToggle,
  elementHierarchyControls,
} from "./elementHierarchyControls";
import {
  ELEMENT_GROUP_ROW,
  elementGroupRowSlotKey,
} from "./elementHierarchyControlSlots";
import { ElementRowActions } from "./ElementRowActions";
import { elementSurfaceControls } from "./elementSurfaceControls";

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
  confirm: props.confirm ?? elementConfirm,
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
const names = computed(() => ({
  ...props.classNames,
  root: ["adapttable-element-plus", props.classNames?.root]
    .filter(Boolean)
    .join(" "),
}));
provideClassNames(() => names.value);
function controls(): TableChromeSlots<TRow> {
  return {
    SortButton: ({ attrs, content }) => elementButton(attrs, content),
    SelectionCheckbox: elementSelectionCheckbox,
    ColumnGroupToggle: elementColumnGroupToggle,
    ResizeHandle: ({ attrs }) => elementButton(attrs, null),
    RowActions: ({ controls: actions }) =>
      h(ElementRowActions<TRow>, {
        controls: actions,
        layout: props.rowActionsLayout,
        label: table.labels.value.rowActionsMenu,
        classNames: names.value,
      }),
    ...elementHierarchyControls<TRow>(),
    GroupRow: (props) => {
      if (!shell.slotFills.value.get(ELEMENT_GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: Element Plus grouping rows require grouping() from @adapttable/element-plus/grouping."
        );
      return renderFeatureSlot(
        elementGroupRowSlotKey<TRow>(),
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
    :options="{ ...props, classNames: names }"
    :slots="elementSurfaceControls(controls())"
    :content="slots"
    :root-ref="setRootElement"
    :scroll-ref="setScrollElement"
  />
</template>

<style>
.adapttable-element-plus {
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  font-family: var(--el-font-family);
  font-size: var(--el-font-size-base);
  min-inline-size: 0;
}

.adapttable-element-plus .el-button + .el-button {
  margin-inline: 0;
}

.adapttable-element-plus [data-adapttable-part="toolbar"],
.adapttable-element-plus [data-adapttable-part="footer"],
.adapttable-element-plus [data-adapttable-part="pager"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.adapttable-element-plus [data-adapttable-part="toolbar"],
.adapttable-element-plus [data-adapttable-part="footer"] {
  padding: 1rem;
}

.adapttable-element-plus [data-adapttable-part="scroll-box"] {
  min-inline-size: 0;
  overflow: auto;
}

.adapttable-element-plus [data-adapttable-part="table"] {
  inline-size: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.adapttable-element-plus :is(th, td) {
  padding: 0.75rem;
  text-align: start;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

.adapttable-element-plus th {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  font-weight: 600;
}

.adapttable-element-plus tbody tr:hover > td {
  background: var(--el-fill-color-light);
}

.adapttable-element-plus [data-adapttable-part="sort-button"] {
  border: 0;
  padding: 0;
  height: auto;
  background: transparent;
  font-weight: inherit;
  color: inherit;
}

.adapttable-element-plus [data-adapttable-part="cards"] {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
}

.adapttable-element-plus [data-adapttable-part="card"] {
  padding: 1rem;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-lighter);
}

.adapttable-element-plus :is(button, input, select):focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

@media (max-width: 40rem) {
  .adapttable-element-plus .el-button {
    min-block-size: 2.75rem;
  }
  .adapttable-element-plus .el-input,
  .adapttable-element-plus .el-select {
    max-inline-size: 100%;
  }
}

.adapttable-element-plus-visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.adapttable-element-plus-filter-popover .el-card {
  overflow: visible;
  border: 0;
}

.adapttable-element-plus-filter-popover [data-adapttable-part="filters-body"],
.adapttable-element-plus [data-adapttable-part="filters-form"] {
  display: grid;
  gap: 0.75rem;
  min-inline-size: 0;
}

.adapttable-element-plus-filter-popover :is(.el-input, .el-select),
.adapttable-element-plus
  [data-adapttable-part="filter-field"]
  :is(.el-input, .el-select) {
  min-inline-size: 0;
  inline-size: 100%;
}

.adapttable-element-plus-filter-popover [data-adapttable-part="filters-header"],
.adapttable-element-plus-filter-popover
  [data-adapttable-part="filters-footer"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 0.5rem;
}

.adapttable-element-plus-checklist-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-inline-size: 0;
}

.adapttable-element-plus-table {
  overflow: visible;
  background: var(--el-bg-color);
  border-color: var(--el-border-color-lighter);
}

.adapttable-element-plus-mobile-card[data-adapttable-part="card"] {
  padding: 0;
}

.adapttable-element-plus [data-adapttable-part="card-row"] {
  display: grid;
  grid-template-columns: minmax(6rem, 2fr) minmax(0, 3fr);
  align-items: start;
  gap: 0.75rem;
  padding-block: 0.5rem;
}

.adapttable-element-plus [data-adapttable-part="card-label"] {
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.adapttable-element-plus [data-adapttable-part="card-value"] {
  margin: 0;
  overflow-wrap: anywhere;
  min-inline-size: 0;
}

.adapttable-element-plus [data-adapttable-part="search-field"] {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1 1 14rem;
  max-inline-size: 28rem;
  min-inline-size: 0;
}

.adapttable-element-plus[data-density="compact"] :is(th, td) {
  padding-block: 0.4rem;
}

.adapttable-element-plus [data-adapttable-part="resize-handle"] {
  padding: 0;
  inline-size: 0.5rem;
  min-inline-size: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  cursor: col-resize;
}
</style>
