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
  keepTableControls,
  provideDataTableClassNames,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
  withKitEnvironment,
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
import { useNaiveLibrary } from "./libraryEnvironment";
import { ROW_ACTIONS_CONTROL, rowActionsControlKey } from "./rowActionsSlot";
import { naiveSurfaceControls } from "./surface";
import { naiveDirection, useNaiveTableStyle } from "./theme";
import type { DataTableProps, DataTableSlots } from "./types";

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
const attrs = useAttrs();
const slots = defineSlots<DataTableSlots<TRow>>();
const card = shallowRef(slots.card);
const footer = shallowRef(slots.footer);
onBeforeUpdate(() => {
  card.value = slots.card;
  footer.value = slots.footer;
});
const names = computed(() => naiveClassNames(props.classNames));
provideDataTableClassNames(() => names.value);
const kit = useNaiveLibrary();
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
      footer: footer.value,
      confirm: props.confirm ?? defaultConfirm,
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
    RowActions: ({ controls: actions }) => {
      if (!shell.slotFills.value.get(ROW_ACTIONS_CONTROL.id)?.length)
        throw new Error(
          "AdaptTable: Naive UI row actions require rowActions() or rowPinning() from @adapttable/naive-ui."
        );
      return renderFeatureSlot(
        rowActionsControlKey<TRow>(),
        shell.slotFills.value,
        {
          controls: actions,
          layout: props.rowActionsLayout,
          label: shell.table.labels.value.rowActionsMenu,
          dir: shell.table.dir.value,
          classNames: names.value,
        }
      );
    },
    GroupRow: (group) => {
      if (!shell.slotFills.value.get(GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable Naive UI: grouped rows require the kit grouping contribution."
        );
      return renderFeatureSlot(GROUP_ROW, shell.slotFills.value, group);
    },
    card: card.value,
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
const Render = () =>
  naiveDirection(shell.table.dir.value, () =>
    h(DataTableSurfaceChrome<TRow>, {
      ...mergeProps(attrs, { class: "adapttable-naive", style: style.value }),
      model: shell,
      options: {
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
      },
      slots: naiveSurfaceControls(tableControls(), shell.density.value),
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
