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
  keepTableControls,
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

import { provideHeadlessClasses } from "./context";
import { headlessButton } from "./controls/basic";
import { headlessSelectionCheckbox } from "./controls/checkbox";
import { provideHeadlessDirection } from "./controls/direction";
import { provideHeadlessPortalContainer } from "./controls/portal";
import { ROW_ACTIONS_CONTROL, rowActionsControlKey } from "./rowActionsSlot";
import { headlessSurfaceControls } from "./surfaceControls";
import {
  headlessColumnGroupToggle,
  headlessHierarchyControls,
  headlessResizeHandle,
} from "./tableControls";

// The binding owns the table state. This component only chooses Headless paint.
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
const content = defineSlots<DataTableSlots<TRow>>();
const card = shallowRef(content.card);
const footer = shallowRef(content.footer);
onBeforeUpdate(() => {
  card.value = content.card;
  footer.value = content.footer;
});
const shell = useDataTableShell<TRow>(() => ({
  ...props,
  searchable,
  forceMobile,
  urlSync,
  multiSort,
  fitColumns,
  collapsibleColumnGroups,
  isLoading,
  isFetching,
  footer: footer.value,
  confirm: props.confirm ?? defaultConfirm,
  onDensityChange: (density: TableDensity) => {
    props.onDensityChange?.(density);
    emit("update:density", density);
  },
  onColumnLayoutChange: (layout: ColumnLayoutState) =>
    emit("update:columnLayout", layout),
}));
const names = computed(() => ({
  ...props.classNames,
  root: ["at-headless", props.classNames?.root].filter(Boolean).join(" "),
}));
provideHeadlessClasses(() => names.value);
const fullscreen = shell.state.get(FULLSCREEN_MODEL);
provideHeadlessPortalContainer(() => fullscreen.value?.container);
provideHeadlessDirection(() => shell.table.dir.value);
const options = computed(() => ({
  ...props,
  searchable,
  forceMobile,
  urlSync,
  multiSort,
  fitColumns,
  collapsibleColumnGroups,
  isLoading,
  isFetching,
  classNames: names.value,
}));
function controls(): TableChromeSlots<TRow> {
  return {
    SortButton: ({ attrs, content }) => headlessButton(attrs, content),
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
            [headlessSelectionCheckbox(control)]
          )
        : headlessSelectionCheckbox(control),
    ColumnGroupToggle: headlessColumnGroupToggle,
    ResizeHandle: headlessResizeHandle,
    RowActions: ({ controls: actions }) => {
      if (!shell.slotFills.value.get(ROW_ACTIONS_CONTROL.id)?.length)
        throw new Error(
          "AdaptTable: Headless UI row actions require rowActions() or rowPinning() from @adapttable/vue-headless-ui."
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
    ...headlessHierarchyControls<TRow>(),
    GroupRow: (control) => {
      if (!shell.slotFills.value.get(GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: Headless group rows require grouping() from @adapttable/vue-headless-ui/grouping."
        );
      return renderFeatureSlot(GROUP_ROW, shell.slotFills.value, control);
    },
    card: card.value,
    cell: content.cell,
    header: content.header,
    headerActions: content.headerActions,
    footer: content.footer,
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
  <DataTableSurfaceChrome
    v-bind="$attrs"
    data-adapttable-kit="vue-headless-ui"
    :model="shell"
    :options="options"
    :slots="headlessSurfaceControls(tableControls())"
    :content="content"
    :root-ref="rootRef"
    :scroll-ref="scrollRef"
  />
</template>
