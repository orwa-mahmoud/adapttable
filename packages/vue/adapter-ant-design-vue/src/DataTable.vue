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
  keepTableControls,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
  withKitEnvironment,
} from "@adapttable/vue/adapter";
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  onBeforeUpdate,
  shallowRef,
  watch,
} from "vue";

import { useAntdConfirm } from "./antdConfirm";
import {
  antdColumnGroupToggle,
  antdHierarchyControls,
} from "./antdHierarchyControls";
import { ANTD_GROUP_ROW } from "./antdHierarchyControlSlots";
import { antdSurfaceControls } from "./antdSurfaceControls";
import { useAntdTokenStyle } from "./antdTheme";
import { provideClassNames } from "./classNamesContext";
import { antdButton } from "./controls/button";
import { antdSelectionCheckbox } from "./controls/checkbox";
import { useAntDesignVueLibrary } from "./libraryEnvironment";
import { ROW_ACTIONS_CONTROL, rowActionsControlKey } from "./rowActionsSlot";

defineOptions({ inheritAttrs: false });
const {
  searchable = true,
  forceMobile = undefined,
  urlSync = undefined,
  multiSort = undefined,
  fitColumns = undefined,
  collapsibleColumnGroups = undefined,
  isLoading = undefined,
  isFetching = undefined,
  ...props
} = defineProps<DataTableProps<TRow>>();
const emit = defineEmits<{
  "update:columnLayout": [layout: ColumnLayoutState];
  "update:density": [density: TableDensity];
}>();
const slots = defineSlots<DataTableSlots<TRow>>();
const cardSlot = shallowRef(slots.card);
const footerSlot = shallowRef(slots.footer);
onBeforeUpdate(() => {
  cardSlot.value = slots.card;
  footerSlot.value = slots.footer;
});
const rootElement = shallowRef<HTMLElement | null>(null);
const scrollElement = shallowRef<HTMLElement | null>(null);
const appContext = getCurrentInstance()?.appContext;
const kit = useAntDesignVueLibrary();
const tokenStyle = useAntdTokenStyle();
const confirmRequest = useAntdConfirm(() => ({
  active: shell.active.value,
  appContext,
  container: rootElement.value ?? undefined,
  dir: props.dir ?? kit.value.dir,
}));
const shell = useDataTableShell<TRow>(() =>
  withKitEnvironment(
    {
      ...props,
      searchable,
      forceMobile,
      urlSync,
      multiSort,
      fitColumns,
      collapsibleColumnGroups,
      isLoading,
      isFetching,
      footer: footerSlot.value,
      confirm: props.confirm ?? confirmRequest,
      onDensityChange: (density: TableDensity) => {
        props.onDensityChange?.(density);
        emit("update:density", density);
      },
      onColumnLayoutChange: (layout: ColumnLayoutState) =>
        emit("update:columnLayout", layout),
    },
    kit.value
  )
);
const { table } = shell;
const names = computed(() => ({
  ...props.classNames,
  root: ["adapttable-ant-design-vue", props.classNames?.root]
    .filter(Boolean)
    .join(" "),
}));
provideClassNames(() => names.value);
function controls(): TableChromeSlots<TRow> {
  return {
    SortButton: ({ attrs, content }) => antdButton(attrs, content),
    SelectionCheckbox: antdSelectionCheckbox,
    ColumnGroupToggle: antdColumnGroupToggle,
    ResizeHandle: ({ attrs }) => antdButton(attrs, null),
    RowActions: ({ controls: actions }) => {
      if (!shell.slotFills.value.get(ROW_ACTIONS_CONTROL.id)?.length)
        throw new Error(
          "AdaptTable: Ant Design Vue row actions require rowActions() or rowPinning() from @adapttable/ant-design-vue."
        );
      return renderFeatureSlot(
        rowActionsControlKey<TRow>(),
        shell.slotFills.value,
        {
          controls: actions,
          layout: props.rowActionsLayout,
          label: table.labels.value.rowActionsMenu,
          classNames: names.value,
        }
      );
    },
    ...antdHierarchyControls<TRow>(),
    GroupRow: (props) => {
      if (!shell.slotFills.value.get(ANTD_GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: Ant Design Vue grouping rows require grouping() from @adapttable/ant-design-vue/grouping."
        );
      return renderFeatureSlot(ANTD_GROUP_ROW, shell.slotFills.value, props);
    },
    card: cardSlot.value,
    cell: slots.cell,
    header: slots.header,
    headerActions: slots.headerActions,
    footer: slots.footer,
  };
}
/** One controls object while the host's slots stay the same. */
const tableControls = keepTableControls(controls, (kept) => [
  kept.card,
  kept.cell,
  kept.header,
  kept.headerActions,
  kept.footer,
]);

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
    :style="tokenStyle"
    :model="shell"
    :options="{
      ...props,
      searchable,
      classNames: names,
    }"
    :slots="antdSurfaceControls(tableControls())"
    :content="slots"
    :root-ref="setRootElement"
    :scroll-ref="setScrollElement"
  />
</template>

<style>
/* Ant Design Vue's own default tokens; the table overrides them inline with
 * the current theme, and a surface outside the table keeps these. */
.adapttable-ant-design-vue,
.adapttable-ant-design-vue-filter-popover,
.adapttable-ant-design-vue-filter-drawer {
  --adapttable-ant-design-vue-primary: #1677ff;
  --adapttable-ant-design-vue-primary-bg: #e6f4ff;
  --adapttable-ant-design-vue-primary-border: #91caff;
  --adapttable-ant-design-vue-danger: #ff4d4f;
  --adapttable-ant-design-vue-white: #fff;
  --adapttable-ant-design-vue-text: rgba(0, 0, 0, 0.88);
  --adapttable-ant-design-vue-text-secondary: rgba(0, 0, 0, 0.65);
  --adapttable-ant-design-vue-text-placeholder: rgba(0, 0, 0, 0.25);
  --adapttable-ant-design-vue-bg: #fff;
  --adapttable-ant-design-vue-fill: #fafafa;
  --adapttable-ant-design-vue-border: #d9d9d9;
  --adapttable-ant-design-vue-border-secondary: #f0f0f0;
  --adapttable-ant-design-vue-radius: 6px;
  --adapttable-ant-design-vue-radius-sm: 4px;
  --adapttable-ant-design-vue-font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
  --adapttable-ant-design-vue-font-size: 14px;
  --adapttable-ant-design-vue-font-size-sm: 12px;
  --adapttable-ant-design-vue-control-height: 32px;
  --adapttable-ant-design-vue-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02),
    0 2px 4px 0 rgba(0, 0, 0, 0.02);
}

.adapttable-ant-design-vue {
  color: var(--adapttable-ant-design-vue-text);
  background: var(--adapttable-ant-design-vue-bg);
  font-family: var(--adapttable-ant-design-vue-font-family);
  font-size: var(--adapttable-ant-design-vue-font-size);
  min-inline-size: 0;
}

.adapttable-ant-design-vue .ant-btn + .ant-btn {
  margin-inline: 0;
}

.adapttable-ant-design-vue [data-adapttable-part="toolbar"],
.adapttable-ant-design-vue [data-adapttable-part="footer"],
.adapttable-ant-design-vue [data-adapttable-part="pager"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.adapttable-ant-design-vue [data-adapttable-part="toolbar"],
.adapttable-ant-design-vue [data-adapttable-part="footer"] {
  padding: 1rem;
}

.adapttable-ant-design-vue [data-adapttable-part="scroll-box"] {
  min-inline-size: 0;
  overflow: auto;
}

.adapttable-ant-design-vue [data-adapttable-part="table"] {
  inline-size: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.adapttable-ant-design-vue :is(th, td) {
  padding: 0.75rem;
  text-align: start;
  border-block-end: 1px solid var(--adapttable-ant-design-vue-border-secondary);
}

/* Unspecified utility tracks must not absorb the data columns' spare width. */
:where(.adapttable-ant-design-vue)
  :is(
    [data-adapttable-part="selection-header"],
    [data-adapttable-part="selection-cell"]
  ) {
  inline-size: 1%;
  white-space: nowrap;
}

:where(.adapttable-ant-design-vue)
  [data-adapttable-part="footer"]
  > div:first-child {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
:where(.adapttable-ant-design-vue)
  [data-adapttable-part="footer"]
  > div:first-child
  > span {
  flex-shrink: 0;
  white-space: nowrap;
}
:where(.adapttable-ant-design-vue) [data-adapttable-part="rows-per-page"] {
  flex: 0 0 5rem;
  inline-size: 5rem;
}

.adapttable-ant-design-vue th {
  color: var(--adapttable-ant-design-vue-text-secondary);
  background: var(--adapttable-ant-design-vue-fill);
  font-weight: 600;
}

/* Pinned cells stick over the cells scrolling beneath them, so they paint the
 * table surface; a hovered row's tint still wins. */
.adapttable-ant-design-vue tbody td[data-pinned] {
  background: var(--adapttable-ant-design-vue-bg);
}

.adapttable-ant-design-vue tbody tr:hover > td {
  background: var(--adapttable-ant-design-vue-fill);
}

.adapttable-ant-design-vue [data-adapttable-part="sort-button"] {
  border: 0;
  padding: 0;
  height: auto;
  background: transparent;
  font-weight: inherit;
  color: inherit;
}

.adapttable-ant-design-vue [data-adapttable-part="cards"] {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
}

.adapttable-ant-design-vue [data-adapttable-part="card"] {
  padding: 1rem;
  border: 1px solid var(--adapttable-ant-design-vue-border-secondary);
  border-radius: var(--adapttable-ant-design-vue-radius);
  box-shadow: var(--adapttable-ant-design-vue-shadow);
}

.adapttable-ant-design-vue :is(button, input, select):focus-visible {
  outline: 2px solid var(--adapttable-ant-design-vue-primary);
  outline-offset: 2px;
}

@media (max-width: 40rem) {
  .adapttable-ant-design-vue .ant-btn {
    min-block-size: 2.75rem;
  }
  .adapttable-ant-design-vue
    :is(.ant-input, .ant-input-affix-wrapper, .ant-select) {
    max-inline-size: 100%;
  }
}

.adapttable-ant-design-vue-visually-hidden {
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

.adapttable-ant-design-vue-filter-popover .ant-card {
  overflow: visible;
  border: 0;
}

.adapttable-ant-design-vue-drawer-card {
  min-block-size: 100%;
  border-radius: 0;
  box-shadow: none;
}

.adapttable-ant-design-vue-filter-popover [data-adapttable-part="filters-body"],
.adapttable-ant-design-vue-filter-drawer [data-adapttable-part="filters-body"],
.adapttable-ant-design-vue [data-adapttable-part="filters-form"] {
  display: grid;
  gap: 0.75rem;
  min-inline-size: 0;
}

.adapttable-ant-design-vue-filter-popover
  :is(.ant-input, .ant-input-affix-wrapper, .ant-select),
.adapttable-ant-design-vue-filter-drawer
  :is(.ant-input, .ant-input-affix-wrapper, .ant-select),
.adapttable-ant-design-vue
  [data-adapttable-part="filter-field"]
  :is(.ant-input, .ant-input-affix-wrapper, .ant-select) {
  min-inline-size: 0;
  inline-size: 100%;
}

.adapttable-ant-design-vue-filter-popover
  [data-adapttable-part="filters-header"],
.adapttable-ant-design-vue-filter-drawer
  [data-adapttable-part="filters-header"],
.adapttable-ant-design-vue-filter-popover
  [data-adapttable-part="filters-footer"],
.adapttable-ant-design-vue-filter-drawer
  [data-adapttable-part="filters-footer"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 0.5rem;
}

.adapttable-ant-design-vue-checklist-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-inline-size: 0;
}

.adapttable-ant-design-vue-table {
  overflow: visible;
  background: var(--adapttable-ant-design-vue-bg);
  border-color: var(--adapttable-ant-design-vue-border-secondary);
}

.adapttable-ant-design-vue-mobile-card[data-adapttable-part="card"] {
  padding: 0;
}

.adapttable-ant-design-vue [data-adapttable-part="card-row"] {
  display: grid;
  grid-template-columns: minmax(6rem, 2fr) minmax(0, 3fr);
  align-items: start;
  gap: 0.75rem;
  padding-block: 0.5rem;
}

.adapttable-ant-design-vue [data-adapttable-part="card-label"] {
  color: var(--adapttable-ant-design-vue-text-secondary);
  font-weight: 500;
}

.adapttable-ant-design-vue [data-adapttable-part="card-value"] {
  margin: 0;
  overflow-wrap: anywhere;
  min-inline-size: 0;
}

.adapttable-ant-design-vue
  [data-adapttable-part="card-value"]
  [data-adapttable-part="edit-cell-activate"] {
  max-inline-size: 100%;
  height: auto;
  min-block-size: var(--adapttable-ant-design-vue-control-height);
  white-space: normal;
}

/* The search icon sits inside the field, as every kit draws it, and the
 * field pushes the toolbar controls to the end of the row. */
.adapttable-ant-design-vue [data-adapttable-part="search-field"] {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 14rem;
  max-inline-size: 28rem;
  min-inline-size: 0;
  margin-inline-end: auto;
}
.adapttable-ant-design-vue [data-adapttable-part="search-icon"] {
  position: absolute;
  inset-inline-start: 0.625rem;
  z-index: 1;
  color: var(--adapttable-ant-design-vue-text-placeholder);
  pointer-events: none;
}
.adapttable-ant-design-vue [data-adapttable-part="search-field"] .ant-input {
  padding-inline-start: 2rem;
}

.adapttable-ant-design-vue[data-density="compact"] :is(th, td) {
  padding-block: 4px;
}

.adapttable-ant-design-vue [data-adapttable-part="resize-handle"] {
  padding: 0;
  inline-size: 0.5rem;
  min-inline-size: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  cursor: col-resize;
}

.adapttable-ant-design-vue [data-adapttable-part="group-cell"] > span,
.adapttable-ant-design-vue
  [data-adapttable-part="group-card"]
  > div:first-child {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.adapttable-ant-design-vue
  :is(
    [data-adapttable-part="group-card"],
    [data-adapttable-part="group-footer-card"],
    [data-adapttable-part="group-more-card"]
  ) {
  padding: 0.75rem;
  border: 1px solid var(--adapttable-ant-design-vue-border-secondary);
  border-radius: var(--adapttable-ant-design-vue-radius);
  background: var(--adapttable-ant-design-vue-fill);
}

.adapttable-ant-design-vue [data-adapttable-part="group-label"] {
  font-weight: 600;
}

.adapttable-ant-design-vue [data-adapttable-part="group-count"] {
  color: var(--adapttable-ant-design-vue-text-secondary);
  font-size: var(--adapttable-ant-design-vue-font-size-sm);
}

/* Pinned rows are named by core; match the family by prefix. */
.adapttable-ant-design-vue
  [data-adapttable-part^="pinned-"]:not(
    [data-adapttable-part^="pinned-summary"]
  ) {
  background: var(--adapttable-ant-design-vue-bg);
}

.adapttable-ant-design-vue [data-adapttable-part^="pinned-summary"] {
  background: var(--adapttable-ant-design-vue-fill);
  font-weight: 600;
}

.adapttable-ant-design-vue [data-adapttable-part^="pinned-"] > td {
  background: inherit;
}

.adapttable-ant-design-vue [data-adapttable-part="separator-cell"] {
  border-block-start: 1px solid
    var(--adapttable-ant-design-vue-border-secondary);
}

.adapttable-ant-design-vue
  :is(
    .adapttable-ant-design-vue-table,
    .adapttable-ant-design-vue-card,
    .adapttable-ant-design-vue-card-body
  ) {
  overflow: visible;
}
.adapttable-ant-design-vue [data-adapttable-part="find-bar"] {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--adapttable-ant-design-vue-border-secondary);
  border-radius: var(--adapttable-ant-design-vue-radius);
  background: var(--adapttable-ant-design-vue-fill);
}

.adapttable-ant-design-vue
  [data-adapttable-part="find-bar"]
  > .adapttable-ant-design-vue-find-input {
  flex: 1 1 12rem;
  min-width: 0;
}

.adapttable-ant-design-vue [data-adapttable-part="find-count"] {
  color: var(--adapttable-ant-design-vue-text-secondary);
  white-space: nowrap;
}
.adapttable-ant-design-vue [data-adapttable-part="status-bar"],
.adapttable-ant-design-vue [data-adapttable-part="selection-stats"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 1rem;
  font-variant-numeric: tabular-nums;
}

.adapttable-ant-design-vue [data-adapttable-part="status-bar"] {
  padding-block: 0.5rem;
  border-block-start: 1px solid
    var(--adapttable-ant-design-vue-border-secondary);
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-item"] {
  display: grid;
  grid-template-columns: 2rem 2rem minmax(0, 1fr) 2rem 2rem;
  align-items: center;
  gap: 0.25rem;
  margin-block: 0.25rem;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-grip"] {
  grid-column: 1;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-visibility"] {
  grid-column: 2;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-label"] {
  grid-column: 3;
  overflow-wrap: anywhere;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-pin"] {
  grid-column: 4;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-more"] {
  grid-column: 5;
}
.adapttable-ant-design-vue-column-panel
  :is(
    [data-adapttable-part="column-menu-grip"],
    [data-adapttable-part="column-menu-visibility"],
    [data-adapttable-part="column-menu-pin"],
    [data-adapttable-part="column-menu-more"]
  ) {
  padding-inline: 0;
  margin-inline-start: 0;
  inline-size: 2rem;
  min-inline-size: 2rem;
  min-block-size: 2rem;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-submenu"] {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: var(--adapttable-ant-design-vue-radius);
  background: var(--adapttable-ant-design-vue-fill);
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-choice"] {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-choice-select"] {
  flex: 1 1 9rem;
  min-width: 0;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-header"] {
  margin-block-end: 0.5rem;
  font-weight: 600;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-bulk"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-block: 0.5rem;
}
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-bulk-button"] {
  margin-inline-start: 0;
}
.adapttable-ant-design-vue-column-panel
  :is(
    [data-adapttable-part="column-menu-label"][data-hidden],
    [data-adapttable-part="column-menu-grip"]
  ) {
  color: var(--adapttable-ant-design-vue-text-secondary);
}
.adapttable-ant-design-vue-column-panel
  :is(
    [data-adapttable-part="column-rename-error"],
    [data-adapttable-part="header-rename-error"]
  ) {
  color: var(--adapttable-ant-design-vue-danger);
}
/* A pinned column's pin button fills with the primary colour. */
.adapttable-ant-design-vue-column-panel
  [data-adapttable-part="column-menu-pin"][aria-pressed="true"] {
  border-color: var(--adapttable-ant-design-vue-primary);
  background-color: var(--adapttable-ant-design-vue-primary);
  color: var(--adapttable-ant-design-vue-white);
}
.adapttable-ant-design-vue-column-panel [data-active] {
  color: var(--adapttable-ant-design-vue-primary);
  background: var(--adapttable-ant-design-vue-primary-bg);
  border-color: var(--adapttable-ant-design-vue-primary-border);
}
.adapttable-ant-design-vue [data-adapttable-part="header-rename-error"] {
  color: var(--adapttable-ant-design-vue-danger);
}

/* An omitted mobile label leaves the value the full card width. */
.adapttable-ant-design-vue
  [data-adapttable-part="card-row"]:has(
    > [data-adapttable-part="card-label"]:empty
  ) {
  display: block;
}
.adapttable-ant-design-vue [data-adapttable-part="card-label"]:empty {
  display: none;
}
.adapttable-ant-design-vue
  [data-adapttable-part="card-row"]:has(
    > [data-adapttable-part="card-label"]:empty
  )
  > [data-adapttable-part="card-value"] {
  margin: 0;
  text-align: start;
  font-size: 1.05em;
  font-weight: 600;
}

.adapttable-ant-design-vue
  [data-adapttable-part="group-card"]
  > div:first-child {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.adapttable-ant-design-vue
  [data-adapttable-part="group-card"]
  [data-adapttable-part="group-aggregate"] {
  margin-inline-start: 0.375rem;
  font-variant-numeric: tabular-nums;
}

.adapttable-ant-design-vue
  [data-adapttable-part="group-row"]
  [data-adapttable-part="group-label"] {
  margin-inline-start: 0.5rem;
  font-weight: 600;
}
.adapttable-ant-design-vue
  [data-adapttable-part="group-row"]
  [data-adapttable-part="group-count"] {
  margin-inline-start: 0.375rem;
  font-size: 0.875em;
}

.adapttable-ant-design-vue [data-adapttable-part="chips"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.5rem 0;
  list-style: none;
  min-inline-size: 0;
}
.adapttable-ant-design-vue [data-adapttable-part="chip"] {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  max-inline-size: 100%;
  padding-inline-start: 0.625rem;
  border: 1px solid var(--adapttable-ant-design-vue-primary-border);
  border-radius: 6px;
  background: var(--adapttable-ant-design-vue-primary-bg);
  color: var(--adapttable-ant-design-vue-primary);
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}
.adapttable-ant-design-vue [data-adapttable-part="chip"]:last-child {
  padding-inline-start: 0;
  border: 0;
  background: transparent;
}
.adapttable-ant-design-vue [data-adapttable-part="chip-remove"] {
  flex: 0 0 auto;
  margin: 0;
  min-inline-size: 2rem;
  min-block-size: 2rem;
}
@media (max-width: 767px) {
  .adapttable-ant-design-vue [data-adapttable-part="chip-remove"] {
    min-inline-size: 44px;
    min-block-size: 44px;
  }
}

/* Card fields use the available card width, including embedded phone previews. */
.adapttable-ant-design-vue dl:has(> [data-adapttable-part="card-row"]) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr));
  gap: 0.75rem;
  margin: 0.75rem 0;
  min-inline-size: 0;
}
.adapttable-ant-design-vue dl > [data-adapttable-part="card-row"] {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  min-inline-size: 0;
  padding: 0.625rem;
  border: 0;
  border-radius: 0.375rem;
  background: var(--adapttable-ant-design-vue-fill);
  overflow-wrap: anywhere;
}
.adapttable-ant-design-vue
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
.adapttable-ant-design-vue
  dl
  > [data-adapttable-part="card-row"]
  > [data-adapttable-part="card-label"] {
  color: inherit;
  font-size: 0.75rem;
  line-height: 1.5;
  font-weight: 500;
}
.adapttable-ant-design-vue
  dl
  > [data-adapttable-part="card-row"]
  > [data-adapttable-part="card-value"] {
  display: block;
  min-inline-size: 0;
  margin: 0;
  overflow-wrap: anywhere;
}
.adapttable-ant-design-vue [data-adapttable-part="card-actions"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block-start: 0.75rem;
  padding-block-start: 0.75rem;
  border-block-start: 1px solid
    color-mix(in srgb, currentColor 15%, transparent);
}
.adapttable-ant-design-vue [data-adapttable-part="card"][data-selected] {
  outline: 2px solid var(--adapttable-ant-design-vue-primary);
  outline-offset: -2px;
}

.adapttable-ant-design-vue
  [data-adapttable-part="card"]
  [data-adapttable-part="action-button"],
.adapttable-ant-design-vue
  [data-adapttable-part="card"]
  [data-adapttable-part="row-actions-trigger"] {
  min-inline-size: 44px;
  min-block-size: 44px;
}
.adapttable-ant-design-vue [data-adapttable-part="card"] .ant-checkbox-wrapper {
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
}
.adapttable-ant-design-vue
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
