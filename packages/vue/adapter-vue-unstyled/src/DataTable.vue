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
const {
  searchable = true,
  forceMobile = undefined,
  urlSync = undefined,
  selectable = undefined,
  multiSort = undefined,
  fitColumns = undefined,
  collapsibleColumnGroups = undefined,
  isLoading = undefined,
  isFetching = undefined,
  ...props
} = defineProps<DataTableProps<TRow>>();
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
  searchable,
  forceMobile,
  urlSync,
  selectable,
  multiSort,
  fitColumns,
  collapsibleColumnGroups,
  isLoading,
  isFetching,
  footer: footerSlot.value,
  confirm: props.confirm ?? defaultConfirm,
  onDensityChange: (density) => {
    props.onDensityChange?.(density);
    emit("update:density", density);
  },
  onSelectionChange:
    selectable ||
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
    SelectionCheckbox: (control) =>
      shell.table.isMobile.value
        ? h(
            "label",
            {
              style: {
                display: "inline-flex",
                minWidth: "44px",
                minHeight: "44px",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              },
            },
            [nativeCheckbox(control.attrs)]
          )
        : nativeCheckbox(control.attrs),
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
    card: slots.card,
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
    class="adapttable-vue-unstyled"
    :model="shell"
    :options="{
      ...props,
      searchable,
    }"
    :slots="nativeSurfaceControls(controls())"
    :content="slots"
    :root-ref="setRootElement"
    :scroll-ref="setScrollElement"
  />
</template>

<style>
.adapttable-vue-unstyled
  [data-adapttable-part="card-row"]:has(
    > [data-adapttable-part="card-label"]:empty
  ) {
  display: block;
}
.adapttable-vue-unstyled [data-adapttable-part="card-label"]:empty {
  display: none;
}
.adapttable-vue-unstyled
  [data-adapttable-part="card-row"]:has(
    > [data-adapttable-part="card-label"]:empty
  )
  > [data-adapttable-part="card-value"] {
  margin: 0;
  text-align: start;
  font-size: 1.05em;
  font-weight: 600;
}

.adapttable-vue-unstyled [data-adapttable-part="group-card"] > div:first-child {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.adapttable-vue-unstyled
  [data-adapttable-part="group-card"]
  [data-adapttable-part="group-aggregate"] {
  margin-inline-start: 0.375rem;
  font-variant-numeric: tabular-nums;
}

.adapttable-vue-unstyled
  [data-adapttable-part="group-row"]
  [data-adapttable-part="group-label"] {
  margin-inline-start: 0.5rem;
  font-weight: 600;
}
.adapttable-vue-unstyled
  [data-adapttable-part="group-row"]
  [data-adapttable-part="group-count"] {
  margin-inline-start: 0.375rem;
  font-size: 0.875em;
}

.adapttable-vue-unstyled [data-adapttable-part="chips"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.5rem 0;
  list-style: none;
  min-inline-size: 0;
}
.adapttable-vue-unstyled [data-adapttable-part="chip"] {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  max-inline-size: 100%;
  padding-inline-start: 0.625rem;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, currentColor 5%, transparent);
  color: inherit;
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}
.adapttable-vue-unstyled [data-adapttable-part="chip"]:last-child {
  padding-inline-start: 0;
  border: 0;
  background: transparent;
}
.adapttable-vue-unstyled [data-adapttable-part="chip-remove"] {
  flex: 0 0 auto;
  margin: 0;
  min-inline-size: 2rem;
  min-block-size: 2rem;
}
@media (max-width: 767px) {
  .adapttable-vue-unstyled [data-adapttable-part="chip-remove"] {
    min-inline-size: 44px;
    min-block-size: 44px;
  }
}

/* Card fields use the available card width, including embedded phone previews. */
.adapttable-vue-unstyled dl:has(> [data-adapttable-part="card-row"]) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr));
  gap: 0.75rem;
  margin: 0.75rem 0;
  min-inline-size: 0;
}
.adapttable-vue-unstyled dl > [data-adapttable-part="card-row"] {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  min-inline-size: 0;
  padding: 0.625rem;
  border: 0;
  border-radius: 0.375rem;
  background: color-mix(in srgb, currentColor 4%, transparent);
  overflow-wrap: anywhere;
}
.adapttable-vue-unstyled
  dl
  > [data-adapttable-part="card-row"]:has(
    > [data-adapttable-part="card-label"]:empty
  ) {
  grid-column: 1 / -1;
  padding: 0;
  background: transparent;
  font-size: 1rem;
  font-weight: 600;
}
.adapttable-vue-unstyled
  dl
  > [data-adapttable-part="card-row"]
  > [data-adapttable-part="card-label"] {
  font-size: 0.75rem;
  line-height: 1.5;
  font-weight: 500;
}
.adapttable-vue-unstyled
  dl
  > [data-adapttable-part="card-row"]
  > [data-adapttable-part="card-value"] {
  display: block;
  min-inline-size: 0;
  margin: 0;
  text-align: start;
  overflow-wrap: anywhere;
}
.adapttable-vue-unstyled [data-adapttable-part="card-actions"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block-start: 0.75rem;
  padding-block-start: 0.75rem;
  border-block-start: 1px solid
    color-mix(in srgb, currentColor 15%, transparent);
}
.adapttable-vue-unstyled [data-adapttable-part="card"][data-selected] {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}

.adapttable-vue-unstyled
  [data-adapttable-part="card"]
  [data-adapttable-part="action-button"],
.adapttable-vue-unstyled
  [data-adapttable-part="card"]
  [data-adapttable-part="row-actions-trigger"] {
  min-inline-size: 44px;
  min-block-size: 44px;
}
.adapttable-vue-unstyled
  [data-adapttable-part="card"]
  :is(
    [data-adapttable-part="row-edit-begin"],
    [data-adapttable-part="row-edit-save"],
    [data-adapttable-part="row-edit-cancel"],
    [data-adapttable-part="expand-button"],
    [data-adapttable-part="tree-toggle"]
  ) {
  min-width: 44px;
  min-height: 44px;
}
</style>
